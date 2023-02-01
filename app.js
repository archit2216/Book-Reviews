const axios = require("axios");
const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const passport=require("passport")
const LocalStrategy=require("passport-local").Strategy;
const session=require("express-session")
const bcrypt=require("bcrypt");
const app=express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"secret",resave:false,saveUninitialized:false}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://architsharma:archit2216@cluster0.apcb9v2.mongodb.net/BooksDB?retryWrites=true&w=majority",{useNewUrlParser:true});

const RevSchema={
    NameOfRev:String,
    Rating:Number,
    DetailRev:String
}
const Review=mongoose.model("Review",RevSchema)

const BookSchema={
    BookId:String,
    ArrayOfRevs:[RevSchema]
}

const BookRev=mongoose.model("BookRev",BookSchema);

const userSchema={
    username:String,
    password:String,
    RevsArray:[RevSchema]
}

const User=mongoose.model("User",userSchema)

passport.use(new LocalStrategy((username,password,done)=>{
    User.findOne({username},(err,user)=>{
        if(err){
            return done(err);
        }
        if(!user){
            return done(null,false,{message:"Incorrect Username"});
        }
        bcrypt.compare(password,user.password,(err,isMatch)=>{
            if(err){
                return done(err);
            }
            if(isMatch){
                return done(null,user)
            }
            return done(null,false,{message:"Incorrect password"})
        })
    })
}));

passport.serializeUser((user,done)=>{
    done(null,user._id);
})
passport.deserializeUser((id,done)=>{
    User.findById(id,(err,user)=>{
        done(err,user);
    })
})


app.get('/',function(req,res){
    res.render('index')
})
app.get('/login',function(req,res){
    res.render("login");
})

app.get('/register',function(req,res){
    res.render("register");
})

app.post('/register',function(req,res){
    const {username,password}=req.body;
    bcrypt.hash(password,10,(err,hash)=>{
        if(err){
            console.log(err);
            return;
        }else{
            const user=new User({username,password:hash});
            user.save((err)=>{
                if(err){
                    console.log(err);
                    return;
                }else{
                    console.log("User created successfully");
                    res.redirect("/search")
                }
            })
        }
    })
})

app.post('/login',passport.authenticate("local"),function(req,res){
    console.log("User logged in");
    res.redirect("/search");
})

app.get("/search",function(req,res){
    if(req.isAuthenticated()){
        res.render("search");
    }else{
        res.redirect('/login')
    }
})


app.get("/logout", async function(req,res){
    try{
        await new Promise((resolve,reject)=>{
            req.logOut((err)=>{
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        })
        await req.session.destroy();
        res.clearCookie("connect.sid");
        res.redirect("/");
    }catch(err){
        console.log(err);
    }
})
let data=[];
app.get('/AllBooks',function(req,res){
    if(req.isAuthenticated()){
        console.log(data)
        res.render("AllBooks",{FoundBooks:data})
    }else{
        res.redirect("/login")
    }
})

app.post('/search',function(req,res){
    let book_name=req.body.book;
    if(book_name.length===0){
        res.redirect('/search?e=' + encodeURIComponent('Enter the name of book'));
        res.redirect('/search');
    }
    book_name.replaceAll(' ','+');

    const options = {
        method: 'GET',
        url:`https://www.googleapis.com/books/v1/volumes?q=${book_name}&key=AIzaSyBlt2jQtdDfF_bmJFZMXbSuZgvJNkXkVO4`,
        async:'true'
      };

    try{
        axios.request(options)
        .then((response)=>{
            const newData=response.data;
            if(response.data.length===0){
                res.redirect('/search?e=' + encodeURIComponent('Enter a valid book name'));
                res.redirect('/search');
            }else{
                res.render("AllBooks",{FoundBooks:newData});
            }
        })
    }catch(err){
        console.log(err);
        res.redirect('/search');
    }
});

app.post("/AllBooks",function(req,res){
    if(req.isAuthenticated()){
        let bookId=req.body.IdOfBook;

        try{
            res.redirect("/book/"+bookId);
        }catch(err){
            console.log(err);
            res.redirect("/AllBooks");
        }
    }else{
        res.redirect("/login");
    }
});

app.get("/book/:customBookId",function(req,res){
    if(req.isAuthenticated()){
    const bookId=req.params.customBookId;
    const options = {
        method: 'GET',
        url:`https://www.googleapis.com/books/v1/volumes/${bookId}?key=AIzaSyBlt2jQtdDfF_bmJFZMXbSuZgvJNkXkVO4`,
        async:'true',
    };
    try{
        axios.request(options)
        .then((response)=>{
            const ReqData=response.data;
            BookRev.findOne({BookId:bookId},function(err,foundBook){
                if(!err){
                    if(foundBook){
                        const MyArray=foundBook.ArrayOfRevs;
                        res.render("book",{BookData:ReqData,GeneratedRevs:MyArray});
                    }else{
                        res.render("book",{BookData:ReqData,GeneratedRevs:[]});
                    }
                }
            });
        })
    }catch(err){
        console.log(err);
        res.redirect("/search");
    }
    }else{
        res.redirect("/login")
    }
});

app.get("/AllReviews/:customBookId",function(req,res){
    if(req.isAuthenticated()){
        const bookId=req.params.customBookId;
        res.render("AllReviews",{UseBook:bookId});
    }else{
        res.redirect("/login");
    }
})
app.post("/AllReviews/:customBookId",function(req,res){
    if(req.isAuthenticated()){
        const NewRev=new Review({
            NameOfRev:req.user.username,
            Rating:req.body.Rate,
            DetailRev:req.body.DetReview
        });

        const Id=req.params.customBookId;
        if(NewRev.NameOfRev.length===0){
            res.redirect('/AllReviews/'+Id+'?e=' + encodeURIComponent('Enter your name'));
        }else if(NewRev.DetailRev.length===0){
            res.redirect('/AllReviews/'+Id+'?e=' + encodeURIComponent('Enter your review for the book'));
        }else if(NewRev.Rating>5 || NewRev.Rating<=0 || NewRev.Rating==null || NewRev.Rating===""){
            // res.redirect("/AllReviews/"+Id);
            res.redirect('/AllReviews/'+Id+'?e=' + encodeURIComponent('Rating should be in the range of 1 to 5'));
        }else{
            let defaultRev=[];
            defaultRev.push(NewRev);
            BookRev.findOne({"BookId":Id},function(err,foundBook){
                if(!err){
                    if(!foundBook){
                        const NewBook=new BookRev({
                            BookId:Id,
                            ArrayOfRevs:defaultRev
                        });
                        NewBook.save();
                        res.redirect("/book/"+Id);
                    }else{
                        foundBook.ArrayOfRevs.push(NewRev);
                        foundBook.save();
                        res.redirect("/book/"+Id);
                    }
                }
            });
        }
    }else{
        res.redirect('/login');
    }
})
app.post("/book/:customBookId",function(req,res){
    const bookId=req.params.customBookId;
    res.redirect("/AllReviews/"+bookId)
});

app.listen(3000,function(){
    console.log("Server has started successfully");
})
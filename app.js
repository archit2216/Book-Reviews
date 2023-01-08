const axios = require("axios");
const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");

const app=express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

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

app.get('/login',function(req,res){
    res.render("login");
})

app.get('/register',function(req,res){
    res.render("register");
})

app.get("/",function(req,res){
    res.render("index");
})

let data=[];
app.get('/AllBooks',function(req,res){
    console.log(data)
    res.render("AllBooks",{FoundBooks:data})
})

app.post('/',function(req,res){
    let book_name=req.body.book;
    if(book_name.length===0){
        res.redirect('/?e=' + encodeURIComponent('Enter the name of book'));
        res.redirect('/');
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
                res.redirect('/?e=' + encodeURIComponent('Enter a valid book name'));
                res.redirect('/');
            }else{
                res.render("AllBooks",{FoundBooks:newData});
            }
        })
    }catch(err){
        console.log(err);
        res.redirect('/');
    }
});

app.post("/AllBooks",function(req,res){
    let bookId=req.body.IdOfBook;

    try{
        res.redirect("/book/"+bookId);
    }catch(err){
        console.log(err);
        res.redirect("/AllBooks");
    }
});

app.get("/book/:customBookId",function(req,res){
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
        res.redirect("/");
    }
});

app.get("/AllReviews/:customBookId",function(req,res){
    const bookId=req.params.customBookId;
    res.render("AllReviews",{UseBook:bookId});
})
app.post("/AllReviews/:customBookId",function(req,res){
    const NewRev=new Review({
        NameOfRev:req.body.NameOfReview,
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
})
app.post("/book/:customBookId",function(req,res){
    const bookId=req.params.customBookId;
    res.redirect("/AllReviews/"+bookId)
});

app.listen(3000,function(){
    console.log("Server has started successfully");
})
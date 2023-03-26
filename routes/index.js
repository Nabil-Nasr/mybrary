const express = require('express');
const router = express.Router()
const Book=require('../models/bookSchema')



router.get('/',(req,res) => {
  // when we rendering index.ejs we call it's layout
  // sort query by creation
  // with limit 2 books
  Book.find().sort({createAt:'desc'}).limit(2)
  .then(books=>{
    // sorting by creation time
    // res.render('index',{books:books.reverse()})
    res.render('index',{books})
  }).catch(err=>{
    res.render('index',{books:[]})
  })
})

module.exports =router
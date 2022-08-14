const express = require('express');
const port = process.env.PORT;
const app = express();

const SyncError = require('./utils/SyncError')

app.get('/', (req,res)=>{
    res.send('Hello World!')
})

app.use((req,res)=>{
    res.status(404)
    res.json({success: false, message: 'not found'})
})

app.use((error,req,res,next)=>{
    res.status(error.status || 500)
    res.json({success: false, message: error.type || 'internal server error'})
})

app.listen(port, ()=>{
    console.log(`listening on port ${port}`)
})
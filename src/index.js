import 'dotenv/config';
import {app} from "./app.js"
import connectDB from "./config/db.js"


connectDB().then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`Server is running at ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("Server cant be connected!");
})

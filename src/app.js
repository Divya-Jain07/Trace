import dotenv from "dotenv"
import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser";
import authRouter from './routes/auth.routes.js'


dotenv.config({path: './.env'})

const app= express();

app.use(cors({origin:"*"}));
app.use(express.json())
app.use(express.urlencoded({extended:true,limit:"16mb"}))
app.use(cookieParser())

app.use('/api/auth',authRouter)

export {app}
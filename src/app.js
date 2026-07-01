import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser";
import authRouter from './routes/auth.routes.js'
import submissionRouter from './routes/submission.routes.js'
import dashboardRouter from './routes/dashboard.routes.js'


const app= express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173", // update to your frontend port
    credentials: true,
    exposedHeaders: ['x-access-token']
}));
app.use(express.json())
app.use(express.urlencoded({extended:true,limit:"16mb"}))
app.use(cookieParser())

app.use('/api/auth',      authRouter)
app.use('/api',           submissionRouter)
app.use('/api/dashboard', dashboardRouter)

export {app}
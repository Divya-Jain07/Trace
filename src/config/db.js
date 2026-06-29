import mongoose from "mongoose";
import dns from "dns";

const connectDB = async()=>{
    try{
        dns.setServers(['1.1.1.1', '8.8.8.8'])
        const connectStr = await mongoose.connect(process.env.MONGODB_URL)
        console.log("MongoDb connected at",connectStr.connection.host);
    }
    catch(err)
    {
        console.log("MongoDb connection failed!",err)
        process.exit(1);
    }
}

export default connectDB;

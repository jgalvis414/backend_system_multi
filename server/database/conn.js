import mongoose from 'mongoose';
import 'dotenv/config';


export default async function connect() {
    const mongoUri = process.env.MONGODB_URI; 

    console.log(`MongoDB URI: ${mongoUri}`);
    
    try {
        await mongoose.connect(mongoUri, { dbName: "testingDb" });
        console.log(`MongoDB successfully connected to ${mongoUri}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        
    }

}
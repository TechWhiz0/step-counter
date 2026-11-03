import mongoose from 'mongoose';

export async function connectDb(url: string) {
  await mongoose.connect(url);
  return mongoose.connection;
}

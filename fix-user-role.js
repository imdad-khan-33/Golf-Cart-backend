import mongoose from 'mongoose';

const mongoUri = 'mongodb+srv://imdadaptech:pakistan123@virtual-therapist.r2e20ee.mongodb.net/golf-cart?retryWrites=true&w=majority';

mongoose.connect(mongoUri).then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection('users').updateOne(
    { email: 'admin1@gmail.com' },
    { $set: { role: 'driver' } }
  );
  console.log('Updated:', result.modifiedCount, 'document(s)');
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

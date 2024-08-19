const cron = require('node-cron');
const { scanApi } = require('./controllers/ApiController');

// Schedule a job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled API scans...');
  try {
    // Fetch all APIs from the database
    const apis = await Api.find();

    // Loop through each API and initiate a scan
    for (let api of apis) {
      await scanApi({ params: { id: api._id } }, { status: () => {}, json: () => {} });
    }
    console.log('All APIs have been scanned.');
  } catch (error) {
    console.error('Error during scheduled scans:', error);
  }
});

import twilio from 'twilio';

const getTwilioClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.error('[TWILIO] ERROR: Credentials not configured');
    console.error(`[TWILIO] ACCOUNT_SID set: ${!!TWILIO_ACCOUNT_SID}`);
    console.error(`[TWILIO] AUTH_TOKEN set: ${!!TWILIO_AUTH_TOKEN}`);
    console.error(`[TWILIO] FROM_NUMBER set: ${!!TWILIO_FROM_NUMBER}`);
    throw new Error('Twilio credentials are not configured');
  }

  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
};

export const sendOTPToPhone = async (phoneNumber, otp) => {
  const { TWILIO_FROM_NUMBER } = process.env;
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY || '5');
  const message = `Your Golf Cart login OTP is ${otp}. It expires in ${expiryMinutes} minutes.`;

  const client = getTwilioClient();

  try {
    return await client.messages.create({
      body: message,
      from: TWILIO_FROM_NUMBER,
      to: phoneNumber
    });
  } catch (error) {
    console.error('[TWILIO] SMS send failed');
    console.error(`[TWILIO] Message: ${error.message}`);
    if (error.code) {
      console.error(`[TWILIO] Code: ${error.code}`);
    }
    if (error.moreInfo) {
      console.error(`[TWILIO] More info: ${error.moreInfo}`);
    }
    throw error;
  }
};

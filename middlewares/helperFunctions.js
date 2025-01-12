function generateOTP() {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const otpLength = 6;
  let otp = "";

  for (let i = 0; i < otpLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }

  return otp;
}

function formatTimestampToLocale(timestamp) {
  const date = new Date(timestamp);
  const formattedTime = date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    // minute: 'numeric',
    // second: 'numeric',
    hour12: true,
  });
  return formattedTime;
}

function mailSend(mail, otp, sub) {
  const request = require("request");
  request.post(
    {
      url: "https://api.smtp2go.com/v3/email/send",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: "api-7C43A99E6AC011EEBC97F23C91C88F4E",
        sender: "save71-noreply@save71.com",
        to: [mail],
        subject: `Save-71 ${sub}`,
        html_body: `
                  <div style="background-color: #f2f2f2; padding: 20px;">
                    <div style="background-color: #ffffff; padding: 20px; border-radius: 10px;">
                      <h1 style="text-align: center; color: #1A63A6;">Save-71</h1>
                      <h1 style="text-align: center; color: #000000;">OTP :  <strong>${otp}</strong></h1>
                    </div>
                  </div>
                `,
        text_body: "Please verify your email",
      }),
    },
    function (err, response, body) {
      // console.log(body);
    }
  );
}

module.exports = {
  generateOTP,
  formatTimestampToLocale,
  mailSend,
};

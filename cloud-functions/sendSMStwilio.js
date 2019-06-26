// expected params
// recipientNumber, message

// cached params
// twilioSid, twilioAuthToken, twilioNumber
let twilioClient = require('twilio')(params.twilioSid, params.twilioAuthToken)

function main(params) {
  twilioClient.messages.create({
    to: params.clientNumber,
    from: params.twilioNumber,
    body: params.message,
  }, function(err, message) {
    if (err) {
      console.log('error:', err);
    } else {
      console.log("sent message " + params.message + " to " + params.clientNumber);
    }
  })

}

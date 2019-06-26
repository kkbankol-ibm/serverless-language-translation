/*Copyright 2018 IBM Corp. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

// executed as webaction

// when SMS messages are received, we need to
// add phone number as a subscriber for x seconds. if key already exists,
// identify sender message language
// forward message to translateText
// var bluebird = require('bluebird')
var openwhisk = require('openwhisk')
// var redis = require('redis')
var ibmdb = require('ibm_db');

// bluebird.promisifyAll(redis.RedisClient.prototype)

params = {
  language_translator_username: "5c207133-1df9-4f45-81ae-2f3a4bc7147a",
  language_translator_password: "72Ozvdld1hlW",
  From: "1323456789",
  Body: "Testing"

}

function main(params) {
  // get twilioSid and twilioAuthToken from
  // https://www.twilio.com/console
  options = {
    "api-key": "d16f007f-d412-4511-87d9-ca34d40c6cce:OWosfg0EHHgTw4FPRxFaPDWS1IqNgihX8OazAZ9XO75VtbNQH1k5yfx7CXDdjr5a",
    apihost: 'openwhisk.ng.bluemix.net'
  }
  var ow = openwhisk(options)
  var LanguageTranslatorV3 = require('watson-developer-cloud/language-translator/v3');
  if (params.__bx_creds && params.__bx_creds.language_translator) {
    translatorConfig = {
      username: params.__bx_creds.language_translator.username,
      password: params.__bx_creds.language_translator.password,
      url: params.__bx_creds.language_translator.url,
      version: "v2",
      type: "bound_creds"
    }
  } else {
    translatorConfig = {
      username: "5c207133-1df9-4f45-81ae-2f3a4bc7147a", //params.language_translator_username,
      password: "72Ozvdld1hlW", //params.language_translator_password,
      url: 'https://gateway.watsonplatform.net/language-translator/api/',
      version: "2019-04-02",
      type: "user_provided"
    }
  }
  var language_translator = new LanguageTranslatorV3(translatorConfig)

  if (params.__bx_creds && params.__bx_creds.db2) {
    // db2Config = {
    // }
  } else {
    db2Config = {
      "hostname": "dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net",
      "password": "n8nmpp0bcll5m@vb",
      "https_url": "https://dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net",
      "port": "50000",
      "ssldsn": "DATABASE=BLUDB;HOSTNAME=dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net;PORT=50001;PROTOCOL=TCPIP;UID=hcg34139;PWD=n8nmpp0bcll5m@vb;Security=SSL;",
      "host": "dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net",
      "jdbcurl": "jdbc:db2://dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net:50000/BLUDB",
      "uri": "db2://hcg34139:n8nmpp0bcll5m%40vb@dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net:50000/BLUDB",
      "db": "BLUDB",
      "dsn": "DATABASE=BLUDB;HOSTNAME=dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net;PORT=50000;PROTOCOL=TCPIP;UID=hcg34139;PWD=n8nmpp0bcll5m@vb;",
      "username": "hcg34139",
      "ssljdbcurl": "jdbc:db2://dashdb-txn-sbox-yp-dal09-03.services.dal.bluemix.net:50001/BLUDB:sslConnection=true;"
    }
  }

  return new Promise((resolve, reject) => {
    // ibmdb.open("DATABASE=<dbname>;HOSTNAME=<myhost>;UID=db2user;PWD=password;PORT=<dbport>;PROTOCOL=TCPIP", function(err, conn) {
    ibmdb.open(db2Config['dsn'], function(err, conn) {
    // ibmdb.open('DATABASE=' + db2Config['db'] + ';' +
    //   'HOSTNAME=' + db2Config['host'] + ';' +
    //   'PORT=' + db2Config['port'] + ';' +
    //   'PROTOCOL=TCPIP;' +
    //   'UID=' + db2Config['username'] + ';' +
    //   'PWD=' + db2Config['password'], // just use db2Config['dsn']
    //   function(err, conn) {
        if (err) {
          reject(err)
          return console.log(err)
        }
        conn.query("select * from numbers where id = " + params.From, function(err, data) {
          if (err) {
            reject(err)
            console.log(err)
          } else {
            console.log(data);
            // if not in db
            if (data.length == 0) {
              // identify language, and then add row to db
              language_translator.identify({
                  text: params.Body,
                  headers: {
                    'X-Watson-Technology-Preview': '2017-07-01'
                  }
                },
                function(err, languages) {
                  if (err) {
                    reject(err)
                    console.log('error:', err);
                  } else {
                    // var key = languages['languages'][0].language + ':' + params.From
                    idLanguage = languages['languages'][0].language
                    console.log( "insert into numbers values ('" + params.From + "','" + idLanguage + "','" + Math.floor(new Date() / 1000) + "')")
                    conn.querySync( "insert into numbers values ('" + params.From + "','" + idLanguage + "','" + Math.floor(new Date() / 1000) + "')")
                    resolve({
                      payload: params.Body,
                      client: "smsclient" + '_' + params.From,
                      senderNumber: params.From,
                      sourceLanguage: idLanguage
                    })
                  }
                })
            } else {
              // update timestamp in matching row
              conn.querySync("update numbers set last_update = '" + Math.floor(new Date() / 1000) + "' where id = '" + params.From + "'")
              console.log("data")
              console.log(data)
              resolve({
                payload: params.Body,
                client: "smsclient" + '_' + params.From, // key.split(':')[1],
                senderNumber: params.From,
                sourceLanguage: data[0]['LANGUAGE'] // TODO, confirm this works.
                // sourceLanguage: key.split(':')[0]
              })
            }
          }
          // conn.close(function() {
          //   console.log('done');
          // });
        })
      });

  }).then(result => {
    return ow.triggers.invoke({
      name: 'msgReceived',
      params: result
    })
  })
}
///

//   // if number isn't registered, identify language and add as key
//   return redisClient.scanAsync(cursor, 'MATCH', "*" + params.From).then(
//     function (res) {
//       var keys = res[1]
//       // if key exists in store
//       return new Promise((resolve, reject) => {
//         if (keys.length > 0) {
//           // reset TTL
//           var key = keys[0]
//           redisClient.expire(key, 300)
//           resolve(
//             {
//               payload: params.Body,
//               client: "smsclient" + '_' + key.split(':')[1],
//               senderNumber: params.From,
//               sourceLanguage: key.split(':')[0]
//             }
//           )}
//         else {
//           language_translator.identify(
//             {
//               text: params.Body,
//               headers: {
//                 'X-Watson-Technology-Preview': '2017-07-01'
//               }
//             },
//             function(err, languages) {
//               if (err)  {
//                 console.log('error:', err);
//               } else  {
//                 var key = languages['languages'][0].language + ':' + params.From
//                 redisClient.set(key, params.From)
//                 redisClient.expire(key, 300)
//                 resolve({
//                   payload: params.Body,
//                   client: "smsclient" + '_' + key.split(':')[1],
//                   senderNumber: params.From,
//                   sourceLanguage: key.split(':')[0]
//                 })
//               }
//             })
//         }
//       }).then(result => {
//         return ow.triggers.invoke({
//           name: 'msgReceived',
//           params: result
//         })
//       })
//     })
//
// }

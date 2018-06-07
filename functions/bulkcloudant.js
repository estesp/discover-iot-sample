/**
 * Create, Update, and Delete documents in bulk:
 * https://docs.cloudant.com/document.html#bulk-operations
 **/

function main(message) {
  var cloudantOrError = getCloudantAccount(message);
  if (typeof cloudantOrError !== "object") {
    return Promise.reject(cloudantOrError);
  }
  var cloudant = cloudantOrError;
  var dbName = message.dbname;

  var msgs = message.messages;
  var entries = [];
  for (var i = 0; i < msgs.length; i++) {
    var entry = {};
    var movedata = JSON.parse(msgs[i].value);
    entry.deviceid = movedata.SENSORID;
    entry.energy = Math.sqrt(
      Math.pow(movedata.X, 2) +
        Math.pow(movedata.Y, 2) +
        Math.pow(movedata.Z, 2)
    );
    entries.push(entry);
  }
  var params = {};

  if (!dbName) {
    return Promise.reject("dbname is required.");
  }
  var cloudantDb = cloudant.use(dbName);

  if (typeof message.params === "object") {
    params = message.params;
  } else if (typeof message.params === "string") {
    try {
      params = JSON.parse(message.params);
    } catch (e) {
      return Promise.reject(
        "params field cannot be parsed. Ensure it is valid JSON."
      );
    }
  }
  docs = {
    docs: entries
  };
  return bulk(cloudantDb, docs, params);
}

function bulk(cloudantDb, docs, params) {
  return new Promise(function(resolve, reject) {
    cloudantDb.bulk(docs, params, function(error, response) {
      if (!error) {
        var responseDocs = {};
        responseDocs.docs = response;
        console.log("success", response);
        resolve(responseDocs);
      } else {
        console.log("Error: ", error);
        reject(error);
      }
    });
  });
}

function getCloudantAccount(message) {
  // full cloudant URL - Cloudant NPM package has issues creating valid URLs
  // when the username contains dashes (common in Bluemix scenarios)
  var cloudantUrl;

  if (message.url) {
    // use bluemix binding
    cloudantUrl = message.url;
  } else {
    if (!message.host) {
      return "cloudant account host is required.";
    }
    if (!message.username) {
      return "cloudant account username is required.";
    }
    if (!message.password) {
      return "cloudant account password is required.";
    }

    cloudantUrl =
      "https://" +
      message.username +
      ":" +
      message.password +
      "@" +
      message.host;
  }

  return require("cloudant")({
    url: cloudantUrl
  });
}

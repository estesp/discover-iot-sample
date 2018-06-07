/**
 *
 * main() will be run when you invoke this action
 *
 * @param Cloud Functions actions accept a single parameter, which must be a JSON object.
 *
 * @return The output of this action, which must be a JSON object.
 *
 */
function main(message) {
  var cloudantOrError = getCloudantAccount(message);
  if (typeof cloudantOrError !== "object") {
    return Promise.reject(cloudantOrError);
  }
  var cloudant = cloudantOrError;
  var dbName = message.dbname;

  if (!dbName) {
    return Promise.reject("dbname is required.");
  }
  var cloudantDb = cloudant.use(dbName);
  // get the view with grouping and totals
  var total = 0.0;
  cloudantDb.view("energyView", "energySum", { group: true }, function(
    err,
    body
  ) {
    if (!err) {
      var devices = body.rows.length;
      console.log(
        "energyTotals: currently " +
          devices +
          " sending data according to cloudant entries"
      );
      for (var i = 0; i < body.rows.length; i++) {
        console.log(
          "energyTotals: adding " +
            body.rows[i].value +
            " to the total energy sum: " +
            total
        );
        total += body.rows[i].value;
      }
      var epochms = Date.now();
      var doc = {
        timestamp: epochms,
        energyTotal: total,
        devices: devices
      };
      cloudantDb.insert(doc);
    }
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

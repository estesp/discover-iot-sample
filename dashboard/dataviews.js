/* Retrieve cloudant information */

var Cloudant = require('cloudant');

// cloudant credentials URL
var cURL = process.env.cloudant_url;
var cloudant = Cloudant({ url: cURL, plugin: 'promises' });
var shakeDb = cloudant.db.use(process.env.cloudant_db);

function descendingTotal(a, b) {
    if (a.value > b.value) {
        return -1;
    } else if (b.value > a.value) {
        return 1;
    } else {
        return 0;
    }
}

var lastSeq = "now";

module.exports = {
    deviceTotals: function(req, res) {
        var resp = [];
        shakeDb.view("energyView", "energySum", {
            'group': true,
            'reduce': true
          }, function(err, body) {
            if (!err) {
                resp = body.rows
                resp.sort(descendingTotal);
                res.send(resp);
            }
        });
    },
    energyTotals: function(req, res) {
        // QUERY: _changes?filter=_view&view=totalView/totals&include_docs=true&since=<lastID>
        // We want to use this kind of query to find recent additions to the view with more data
        // points. Will have to store last change seq ID and call with it each time.
        cloudant.db.changes(process.env.cloudant_db, {
            'filter': '_view',
            'view': 'totalView/totals',
            'include_docs': true,
            'since': lastSeq
        }, function(err, body) {
            console.log("last seq: "+body.last_seq);
            lastSeq = body.last_seq;
            if (body.results.length > 0) {
                res.send(body.results);
            } else {
                res.send({});
            }
        });
    }
};

function isEmpty(obj) {
    if (obj === undefined) {
        return true;
    }
    return Object.keys(obj).length === 0;
}

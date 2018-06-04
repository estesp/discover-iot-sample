// delete all docs in Cloudant
var Cloudant = require('cloudant')

var dbname = process.env.cloudant_db;
Cloudant({url: process.env.cloudant_url}, function(err, cloudant) {
  if (err)
    return console.log('Error connecting to Cloudant account %s: %s', url, err.message)

  // specify the database we are going to use
  var ldb = cloudant.db.use(dbname)
  ldb.list(function(err, body) {
	if (err) 
	    return console.log('Error listing docs')
	body.rows.forEach(function(doc) {
		console.log('deleting id: %s, rev: %s', doc.id, doc.value.rev)
		ldb.destroy(doc.id, doc.value.rev, function(err, body) {
		    if (err) console.log('ERROR: %s', err)
			else console.log(body)
		})
	})
  })
})

// can wrap with this if to not delete design docs:
// if ( doc.id.substring(0,7) != '_design') {

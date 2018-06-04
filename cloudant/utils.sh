
# create views
ccurl -X PUT --data-binary @totalView-cloudant.json /_design/totalView
ccurl -X PUT --data-binary @energyView-cloudant.json /_design/energyView

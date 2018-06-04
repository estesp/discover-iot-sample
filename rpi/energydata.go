package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	blinkt "github.com/alexellis/blinkt_go"
)

const maxRate = 300.0

/* [ { seq: '8015-g1AAAAObeJzLYWBg4MhgTmFQTklKzi9KdUhJMtRLytUtz8gszjYwMNJLzskvTUnMK9HLSy3JASpmSmRIkv___39WBnMSAwNLQC5QjD0x1dzQwCiROFNQbTPGb1uSApBMsodbyPwLbGFKqmWycZolcQahWmhEwEIHkIXxCAs_QyxMNktNSzIgziDSLEwAWViPCFIJsIWplsaGppZJNLAwjwVIMjQAKaCd86G-PA-21NA0xSLN0IJmli6AWLofaukMsKUmqaZGphbGNLP0AMTS-1BLt4MtNTczMDCztCTHUgIpFmLpA4ilsER0B2xpmlGSkWGiIXGGZQEAxmwg8Q',
    id: 'ce3c06de9581cbb60dc8eb027f9c3b3c',
    changes: [ [Object] ],
    doc:
     { _id: 'ce3c06de9581cbb60dc8eb027f9c3b3c',
       _rev: '1-4e288535d2e1602fb962a63e7df9de12',
       timestamp: 1527617999987,
       energyTotal: 3245.5341237306384,
	   devices: 3 } } ]
*/
type response struct {
	LastSeq string    `json:"last_seq"`
	Results []results `json:"results"`
}

type results struct {
	Seq string   `json:"seq"`
	ID  string   `json:"id"`
	Doc document `json:"doc"`
}

type document struct {
	ID          string  `json:"_id"`
	Revision    string  `json:"_rev"`
	Timestamp   uint64  `json:"timestamp"`
	EnergyTotal float64 `json:"energyTotal"`
	Devices     int     `json:"devices"`
}

func main() {
	var (
		url        string
		lastEnergy float64

		since = "now"
	)
	brightness := 0.9
	bkt := blinkt.NewBlinkt(brightness)
	bkt.SetClearOnExit(true)
	bkt.Setup()
	blinkt.Delay(100)

	// db changes: _changes?filter=_view&view=totalView/totals&include_docs=true&since=<lastID>
	cloudantURL := os.Getenv("cloudant_url")
	cloudantDB := os.Getenv("cloudant_db")
	if cloudantURL == "" {
		fmt.Fprintf(os.Stderr, "Environment variable 'cloudant_url' must be set.")
		os.Exit(-1)
	}
	if cloudantDB == "" {
		fmt.Fprintf(os.Stderr, "Environment variable 'cloudant_db' must be set.")
		os.Exit(-1)
	}

	// loop on changes
	for {
		url = fmt.Sprintf("%s/%s/_changes?filter=_view&view=totalView/totals&include_docs=true&since=%s",
			cloudantURL, cloudantDB, since)

		dbClient := http.Client{
			Timeout: time.Second * 2, // Maximum of 2 secs
		}

		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			log.Fatal(err)
		}
		req.Header.Set("User-Agent", "rpi3-energy-client")
		res, err := dbClient.Do(req)
		if err != nil {
			log.Fatal(err)
		}

		body, err := ioutil.ReadAll(res.Body)
		if err != nil {
			log.Fatal(err)
		}

		jsonResp := response{}
		if err := json.Unmarshal(body, &jsonResp); err != nil {
			log.Fatal(err)
		}

		for _, change := range jsonResp.Results {
			if lastEnergy > 0 {
				difference := change.Doc.EnergyTotal - lastEnergy
				if difference > 0 {
					displayRate(bkt, difference/float64(change.Doc.Devices))
				}
			}
			lastEnergy = change.Doc.EnergyTotal
		}
		fmt.Println(jsonResp.LastSeq)
		since = jsonResp.LastSeq
		// sleep before next query
		time.Sleep(700 * time.Millisecond)
	}
}

// blinkt reveal rate in lights
func displayRate(bkt blinkt.Blinkt, rate float64) {
	fmt.Printf("rate: %2.2f\n", rate)

	// from testing, significant shaking (per phone) can generate numbers in the 500-600
	// range (per second), so let's make 700 the scale (at 700, all lights will light)
	// if rate goes above 700, start changing light color, with all red by the time we are
	// at 1000 or so.
	pixelset := make([]int, 8)
	if rate > maxRate {
		red := int((rate - maxRate) / maxRate * 8.0)
		if red > 8 {
			red = 8
		}
		for i := 0; i < 8; i++ {
			if i < red {
				pixelset[i] = 2
			} else {
				pixelset[i] = 1
			}
		}
	} else {
		// {max_rate} or less; use only green and off
		on := int((rate / maxRate) * 8.0)
		for i := 0; i < 8; i++ {
			if i < on {
				pixelset[i] = 1
			} else {
				pixelset[i] = 0
			}
		}
	}
	bkt.Clear()
	for i := 0; i < 8; i++ {
		switch pixelset[i] {
		case 0:
			bkt.SetPixel(i, 0, 0, 0)
		case 1:
			bkt.SetPixel(i, 0, 150, 0)
		case 2:
			bkt.SetPixel(i, 150, 0, 0)
		}
	}
	bkt.Show()
	blinkt.Delay(100)
}

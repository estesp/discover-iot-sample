FROM resin/raspberrypi3-alpine-golang:1.10 AS bld

ENV APP "/go/src/github.com/estesp/piapp"
ENV GOPATH "/go"

RUN mkdir /bld && cd /bld && git clone git://git.drogon.net/wiringPi && \
    cd wiringPi/wiringPi && make && make install LDCONFIG=echo

RUN mkdir -p ${APP}
WORKDIR ${APP}
COPY energydata.go ${APP}
RUN go get github.com/alexellis/blinkt_go
RUN go build -o energydata .

FROM alpine:3.7
ENV APP "/go/src/github.com/estesp/piapp"
RUN apk --no-cache add ca-certificates
COPY --from=bld /usr/lib/libwiringPi.so /usr/lib
COPY --from=bld ${APP}/energydata /usr/bin

CMD /usr/bin/energydata

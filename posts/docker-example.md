title : Docker example
date : 2019-03-08
tags : post
---

here is a docker file

    FROM alpine:3.7

    RUN apk update &&\
        apk upgrade &&\
        apk add git &&\
        apk add openssh &&\
        apk add bash &&\
        apk add python &&\
        apk add nodejs=8.9.3-r1 &&\
        apk add ruby=2.4.4-r0 &&\
        apk add --update ruby-dev &&\
        apk add ruby-rdoc &&\
        apk add ruby-irb &&\
        apk add --update build-base libffi-dev &&\
        gem update --system &&\
        gem install scss_lint &&\
        npm install grunt -g &&\
        npm install uglify-es -g &&\
        npm install yarn -g &&\
        npm install jspm -g &&\
        mkdir -p /usr/build/src

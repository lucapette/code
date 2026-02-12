---
tags:
  - golang
  - influxdb
  - grafana
date: "2017-02-23T00:00:00Z"
keywords: golang, grafana, influxdb, open source, productivity
title: Building an activity tracker with Go, Grafana, and InfluxDB
aliases:
  - /building-an-activity-tracker-with-go-grafana-and-influxdb
---

Recently, my routine changed a lot. Since I stopped running teams I'm not
jumping from one meeting to another; I now spend most working time on my laptop.
I have the tendency to procrastinate when I'm alone so I need measurable data to
understand what to improve in my habits. I ran into [rescue
time](https://www.rescuetime.com/) and tried it out for a few days despite
having privacy concerns. The service is helpful and I decided to write a
simplified version of it as an excuse to play around with
[Grafana](http://grafana.org/) and
[InfluxDB](https://github.com/influxdata/influxdb), two open source projects I
like very much. This was my plan:

- Figure out a way to say which application is running in the foreground
- Write a Go daemon that sends this information to InfluxDB once per second
- Create a dashboard in Grafana to visualise my activities
- Open source the small program
- Write the article you're reading :)

## Check what's in the foreground

I had no idea how to check which application is running in the foreground, so I
had to do some research. I discovered
[AppleScript](https://en.wikipedia.org/wiki/AppleScript) is a thing and scoped
my search. Some copy and pasting got me to this
[script](https://gist.github.com/lucapette/41607dfd69f45d70059d029b7b41436f).
Only after I was done with a first version, I learned that it's possible to use
[JavaScript](https://developer.apple.com/library/content/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/Introduction.html#//apple_ref/doc/uid/TP40014508)
for automation. I will probably rewrite the script in JavaScript before adding
more features, but at the time I already had a working script and decided to
move forward with it.

## The Go program

I wrapped the script with a Go program
[here](https://github.com/lucapette/tracker/commit/15fd9d2) and, as usual, I
liked the experience with Go. The language is boring, fast, and has a solid
standard library.

It was time for the program to send data to InfluxDB which I installed it via
brew. I couldn't make InfluxDB work as a service at first try and decided to
ignore the problem, I could go back to it later. Then I created a db called `me`
and moved on to the [writing
data](https://docs.influxdata.com/influxdb/v1.2/guides/writing_data/) guide. The
protocol looked simple, so I decided to copy a piece of the official Go client
instead of adding a dependency to such a small program. The InfluxDB API is
friendly and the code from the client library is easy to adapt; I made it work
in this [commit](https://github.com/lucapette/tracker/commit/d6d7e63).

The only noticeable thing the introduction of categories. The program figures
out the activity name via the AppleScript. Each activity has an associated
category and each category has a score. That's a way of clustering activities
together, e.g. "iTerm2" and "github.com" are associated with "Development" that
has a score of `1`. "Twitter" is associated with "Social" that has a score of
`-1`. That way I can build a dashboard that quantifies how productive my day is
and which kind of activity I spend my time on. I had to try a couple of times to
make it work as I had some trouble understanding how to send a string as a
value: it needed quotes around the value itself and I had tried things out
without reading the documentation. The docs do a great job at explaining the
details
[here](https://docs.influxdata.com/influxdb/v1.2/write_protocols/line_protocol_reference/)
. It was a good reminder to read the documentation before writing the code.
Before moving on to the visualisation of the data, I split the programs in
multiple [files](https://github.com/lucapette/tracker/commit/3ef4db8) so that it
was easier to reason about it. I also added some
[tests](https://github.com/lucapette/tracker/commit/1235c12).

## Run it in the background

It was time to run `tracker` in the background. I had to get back to the issue
with InfluxDB, so I started reading the logs to understand why it wouldn't
start. The fix consisted of one command:

```sh
influxd config > /usr/local/etc/influxdb.conf
```

Probably something was wrong with the brew formula. Normally, I would have
investigated and tried to open a pull request, but I was too excited to get to
the first version of the Grafana dashboard. As soon as I tried to visualise the
data, I realised I had understood the InfluxDB data model wrong. The score of
each activity had to be a field and not a tag, otherwise InfluxDB could not
perform any math. It makes sense, and once again I should have read the docs
first! I changed the data model
[here](https://github.com/lucapette/tracker/commit/8c96cf7) so I could get the
average score of an activity in a given time-frame.

I left the program running on my machine for a few days so I could test the
Grafana dashboard with meaningful data. As soon as I looked at the data, I
realised I needed to add more default categories. I improved how the program
loaded default categories
[here](https://github.com/lucapette/tracker/commit/3aedd51) with the nice little
[go-bindata](https://github.com/jteeuwen/go-bindata/) tool. `tracker` read the
content of the file from the binary itself and put the default categories
database in memory. This way the database became easier to extend.

## Grafana dashboard

Finally, I built a dashboard and it looked like this:

![tracker screenshot](/img/tracker.png)

Grafana has all the characteristics of a good product: you don't need to read
the documentation to use its interface and if you try things out they often just
work. The documentation is very good anyway, I needed help with the
[table](http://docs.grafana.org/features/panels/table_panel/) panel and the
official documentation was my only source of information.

## What's next?

`tracker` has been an exciting exercise so far. It's amazing how much you can
accomplish and how little effort it takes if you use open source projects like
Grafana and InfluxDB. In my attempt to give back to the open source community, I
will slowly make `tracker` more usable for other people and I will keep taking
notes along the way so I can write other articles about the experience. I
created a [roadmap](https://github.com/lucapette/tracker/projects/1), so it's
easier to understand the direction of the project.

Thank you for reading and stay tuned for the next article!

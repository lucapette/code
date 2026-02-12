# CLI

A collection of command line related notes. Mostly things I can't quite
remember.

## Check rate by line

```sh
$ fakedata noun -S | pv -b -l -a -t -n > /dev/null
1.0000 1076795
2.0000 2177988
3.0002 3292729
```

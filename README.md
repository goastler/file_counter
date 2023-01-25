# File counter
Summarise directories by total size and file count.

## Motivation
Linux's `du` doesn't count number of files in a directory, only total size. Wouldn't it be nice if it would do both?

## Setup
The usual: `npm i`

## Let's run it
`npm start /path/to/my/folder`

Need to log the output because you have more files than terminal scroll buffer?
`npm start /path/to/my/folder > log.txt`

## Great, but I want to find the largest file by size or file count!
A little terminal magic can sort that right out as I haven't built this into the program, yet.
```
npm start /path/to/my/folder > log.txt

# sort by 1st column for file size
sort -r -k 1 -n log.log > sorted.txt

# sort by 2nd column for file count
sort -r -k 2 -n log.log > sorted.txt
```

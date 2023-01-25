import { stat, Stats } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

// cmdline args for node + js script + path
if(process.argv.length < 3) {
    throw new Error('expected a single parameter')
}
const loc = process.argv[2]

// TODO empty loc
// TODO loc contains . or ..
// const loc = '/home/goastler'

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export const toResult = <A>(fn: Promise<A>): Promise<Result<A>> => {
    return new Promise((resolve, reject) => {
        fn.then(res => {
            resolve({ok: true, value: res})
        }).catch(err => {
            resolve({ok: false, error: err})
        })
    })
}

interface Metric {
    [key: string]: number
}

interface Entry {
    filePath: string,
    statPromise: Promise<Result<Stats>>,
    childrenPromise: Promise<Result<string[]>>,
}

// TODO symlinks

const now = new Date(0)
const defaultStat: Stats = {
    isFile: function (): boolean {
        return false
    },
    isDirectory: function (): boolean {
        return false
    },
    isBlockDevice: function (): boolean {
        return false
    },
    isCharacterDevice: function (): boolean {
        return false
    },
    isSymbolicLink: function (): boolean {
        return false
    },
    isFIFO: function (): boolean {
        return false
    },
    isSocket: function (): boolean {
        return false
    },
    dev: 0,
    ino: 0,
    mode: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: 0,
    blksize: 0,
    blocks: 0,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: now,
    mtime: now,
    ctime: now,
    birthtime: now
}

const examine = async (filePath: string) => {
    filePath = path.normalize(path.join(path.dirname(filePath), path.basename(filePath)))
    const rootFilePath = filePath
    // store size + count for each file + dir
    const sizes: Metric = {}
    const counts: Metric = {}
    // maintain a queue of dirs to explore
    const queue: Entry[] = [{
        filePath: filePath, 
        statPromise: toResult(fs.stat(filePath)), 
        childrenPromise: toResult(fs.readdir(filePath))
    }]
    let total = 0

    while(queue.length > 0) {
        const entry = queue.pop()
        if(!entry) {
            throw new Error('queue exhausted prematurely')
        }

        const filePath = entry.filePath
        let result = await entry.statPromise
        if(!result.ok) {
            console.error(`could not stat ${filePath}: ${result.error}`)
            result = {
                ok: true,
                value: defaultStat
            }
        }
        const stats = result.value

        if(!stats.isDirectory() && !stats.isFile()) {
            console.error(`${filePath} is not a file or directory`)
            result = {
                ok: true,
                value: defaultStat
            }
        }

        let parent = filePath
        while(parent.length >= rootFilePath.length) {
            if(sizes[parent] === undefined) {
                sizes[parent] = 0
            }
            if(stats.isFile()) {
                // collect file size
                sizes[parent] = (sizes[parent] || 0) + stats.size
            }
            // dirs start counting from 0, files from 1 (as it's just themselves)
            if(counts[parent] === undefined) {
                // not seen before, init count to 0 for dir (as dir is empty) and 1 for file (as only includes itself)
                if(stats.isDirectory()) {
                    counts[parent] = 0
                } else {
                    counts[parent] = 1
                }
            } else {
                // inc the count
                counts[parent]++
            }
            parent = path.normalize(path.dirname(parent))
        }

        let children: string[] = []
        if(stats.isDirectory()) {
            const result = await entry.childrenPromise
            if(result.ok) {
                children = result.value
            } else if(stats.isDirectory()) {
                console.error(`could not read dir ${filePath}: ${result.error}`)
            }
        }

        for(let i = 0; i < children.length; i++) {
            const child = path.join(filePath, children[i])
            if(child.includes("/.")) {
                // ignore hidden files
                continue
            }
            const statPromise = toResult(fs.stat(child))
            const childrenPromise = toResult(fs.readdir(child))
            queue.push({
                filePath: child,
                statPromise: statPromise,
                childrenPromise: childrenPromise
            })
        }   

        // TODO check access
        total++
        console.error(`${total} - ${queue.length}`)
    }

    return {
        counts,
        sizes,
    }
}

const main = async (loc: string) => {
    const result = await examine(loc)
    for(const key in result.sizes) {
        console.log(`${result.sizes[key]} ${result.counts[key]} ${key}`)
    }
}

main(loc)
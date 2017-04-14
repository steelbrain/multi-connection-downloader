/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'

import * as Helpers from './helpers'
import type { DownloadConfig } from '../types'

export default class Connection {
  status: boolean;
  worker: Object;
  emitter: Emitter;
  options: DownloadConfig;
  filePath: string;
  fileSize: number;
  fileName: ?string;
  visitedUrls: Array<string>;
  subscriptions: CompositeDisposable;
  supportsResume: boolean;
  contentEncoding: ?string;
  constructor(worker: Object, options: DownloadConfig, filePath: string) {
    this.status = true
    this.worker = worker
    this.emitter = new Emitter()
    this.options = options
    this.filePath = filePath
    this.fileSize = Infinity
    this.visitedUrls = []
    this.subscriptions = new CompositeDisposable()
    this.supportsResume = false
    this.contentEncoding = null

    this.subscriptions.add(this.emitter)
  }
  abort(): void {
    this.status = false
  }
  async activate(): Promise<void> {
    const headers: Object = {
      'User-Agent': 'sb-downloader for Node.js',
      'Accept-Encoding': 'gzip, deflate',
    }
    if (this.worker.getCurrentIndex() > 0) {
      headers.Range = `bytes=${this.worker.getCurrentIndex()}-${this.worker.getLimitIndex()}`
    }
    const { response, visitedUrls } = await Helpers.openConnection(this.options.url, {
      headers: Object.assign({}, this.options.headers, headers),
    })
    if (response.statusCode > 299 && response.statusCode < 200) {
      // Non 2xx status code
      throw new Error(`Received non-success http code '${response.statusCode}'`)
    }
    this.visitedUrls = visitedUrls
    this.fileSize = Helpers.getFileSize(response.headers)
    this.supportsResume = {}.hasOwnProperty.call(response.headers, 'accept-ranges') || {}.hasOwnProperty.call(response.headers, 'content-range')
    if ({}.hasOwnProperty.call(response.headers, 'content-encoding')) {
      this.contentEncoding = response.headers['content-encoding']
    }
    this.fileName = Helpers.guessFileName(this.visitedUrls.slice(), response.headers)
  }
  async rename(filePath: string): Promise<void> {

  }
  dispose() {
    this.subscriptions.dispose()
  }
}

///getMediaInfoByUrl
export interface IMediaInfo {
  "version": string,
  "title": string,
  "author_name": string,
  "author_url": string,
  "author_id": number | null,
  "media_id": string,
  "provider_name": string,
  "provider_url": string,
  "type": string,
  "width": number | null,
  "height": number | null,
  "html": string,
  "thumbnail_url": string,
  "thumbnail_width": number | null,
  "thumbnail_height": number | null,
}

import axios, {AxiosInstance} from 'axios'
import {ResultFetchMethod} from '../types/resultFetchMethod';
import {IMediaInfo} from '../types/InstagramFetch';

const fetch = require('node-fetch');
const formData = require('form-data');

export default class Instagram {
  private csrfToken: string;
  private sessionId: string;
  private userAgent: string;
  private userIdFollowers: {};
  private timeoutForCounter: number;
  private timeoutForCounterValue: number;
  private paginationDelay: number;
  private receivePromises: {};
  private searchTypes: string[];
  public essentialValues: any;
  private baseHeader: any;
  private rollout_hash: any;
  private axios: AxiosInstance;

  constructor(csrfToken: string = null, sessionId: string = null) {
    this.csrfToken = csrfToken;
    this.sessionId = sessionId;
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
    this.userIdFollowers = {};
    this.timeoutForCounter = 300;
    this.timeoutForCounterValue = 30000;
    this.paginationDelay = 30000;
    this.receivePromises = {};
    this.searchTypes = ['location', 'hashtag'];

    this.essentialValues = {
      sessionid: undefined,
      ds_user_id: undefined,
      csrftoken: undefined,
      shbid: undefined,
      rur: undefined,
      mid: undefined,
      shbts: undefined,
      mcd: undefined,
      ig_cb: 1,
      //urlgen      : undefined //this needs to be filled in according to my RE
    };

    this.axios = axios.create({
      baseURL: 'https://www.instagram.com/',
      headers: {
        'accept-langauge': 'en-US;q=0.9,en;q=0.8,es;q=0.7',
        'origin': 'https://www.instagram.com',
        'referer': 'https://www.instagram.com/',
        'upgrade-insecure-requests': '1',
        'user-agent': this.userAgent,
      }
    });
  }


  generateCookie(simple: boolean = false) {
    if (simple) return 'ig_cb=1';

    var cookie = '';
    var keys = Object.keys(this.essentialValues);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (this.essentialValues[key] !== undefined) {
        cookie += key + '=' + this.essentialValues[key] + (i < keys.length - 1 ? '; ' : '')
      }
    }

    return cookie;
  }

  combineWithBaseHeader(data: any) {
    return Object.assign(this.baseHeader, data)
  }

  updateEssentialValues(src: string[], isHTML = false) {
    if (!isHTML) {
      let str = src.join(' ');
      let keys = Object.keys(this.essentialValues);

      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let rgx = RegExp(`${key}=[\\w\\d-%]+;`);
        const rgxRes = rgx.exec(str);

        if (rgxRes !== null) {
          let res = rgxRes[0];
          res = res.replace(key + '=', '')
            .replace(';', '');

          this.essentialValues[key] = res;
        }
      }
    } else {
      var subStr: any = src;

      var startStr = '<script type="text/javascript">window._sharedData = ';
      var start = subStr.indexOf(startStr) + startStr.length;
      subStr = subStr.substr(start, subStr.length);

      subStr = subStr.substr(0, subStr.indexOf('</script>') - 1);

      var json = JSON.parse(subStr);

      this.essentialValues.csrftoken = json.config.csrf_token;
      this.rollout_hash = json.rollout_hash;
    }
  }

  /**
   * User data by username
   * @param {String} username
   * @return {Object} Promise
   */
  getUserDataByUsername(username: any) {

    var fetch_data = {
      'method': 'get',
      'headers':
        this.combineWithBaseHeader(
          {
            'accept': 'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
            'accept-encoding': 'gzip, deflate, br',
            'cookie': this.generateCookie()
          }
        )
    }

    return fetch('https://www.instagram.com/' + username, fetch_data).then((res: any) => res.text().then(function (data: any) {
      console.log(data)

      const regex = /window\._sharedData = (.*);<\/script>/;
      const match = regex.exec(data);
      if (typeof match[1] === 'undefined') {
        return '';
      }
      return JSON.parse(match[1]).entry_data.ProfilePage[0];
    }))
  }


  isPrivate(username: any) {
    return this.getUserDataByUsername(username).then((data: any) =>
      data.user.is_private
    )
  }

  getUserFollowers(userId: any, endCursor: any, count: any, followersCounter: any, selfSelf: any) {
    const self: any = this;

    if (!selfSelf)
      self.userIdFollowers[userId] = []

    if (typeof self.receivePromises[userId] !== 'undefined' && !selfSelf)
      return 0

    count = count || 20;

    const query: any = {
      id: userId,
      include_reel: true,
      fetch_mutual: true,
      first: count
    };
    if (endCursor) {
      query.after = endCursor;
    }

    const variables = encodeURIComponent(JSON.stringify(query));

    self.receivePromises[userId] = 1;

    return fetch('https://www.instagram.com/graphql/query/?query_hash=56066f031e6239f35a904ac20c9f37d9&variables=' + variables,
      {
        'method': 'get',
        'headers':
          this.combineWithBaseHeader(
            {
              'accept': 'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
              'accept-encoding': 'gzip, deflate, br',
              'cookie': this.generateCookie()
            }
          )
      }).then((res: any) => {
      return res.text().then((response: any) => {
        //prepare convert to json
        let json = response;

        try {
          json = JSON.parse(response)
        } catch (e) {
          console.log('Session error')
          console.log(response)
          return [];
        }

        if (json.status == 'ok') {
          self.userIdFollowers[userId] = self.userIdFollowers[userId].concat(json.data.user.edge_followed_by.edges)

          if (json.data.user.edge_followed_by.page_info.has_next_page) {
            let end_cursor = json.data.user.edge_followed_by.page_info.end_cursor
            return new Promise((resolve) => {
              console.log('fetching next page in ' + this.paginationDelay / 1000 + ' seconds');
              setTimeout(() => {
                resolve(self.getUserFollowers(userId, end_cursor, count, 1, 1));
              }, this.paginationDelay);
            });
          } else {
            self.receivePromises[userId] = undefined
            return self.userIdFollowers[userId]
          }

        } else {
          return new Promise((resolve) => {
            console.log(json);
            console.log('request failed, retrying in ' + this.paginationDelay / 1000 + ' seconds');
            setTimeout(() => {
              resolve(self.getUserFollowers(userId, endCursor, count, followersCounter, selfSelf));
            }, this.paginationDelay);
          });
        }

      }).catch((e: any) => {
        console.log('Instagram returned:' + e)
      })
    })
  }

  getCsrfToken = async () => {
    try {
      const res = await this.axios.get('/', {
        headers:
          {
            'accept': 'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
            'accept-encoding': 'gzip, deflate, br',
            'cookie': this.generateCookie(true)
          }

      });

      const headers = res.headers['set-cookie'];

      this.updateEssentialValues(headers);
      const html = res.data;
      this.updateEssentialValues(html, true);

      return {
        success: true,
        error: null,
        data: this.essentialValues.csrftoken
      };
    } catch (e) {
      return {
        success: false,
        error: e
      }
    }
  };

  auth = async (username, password) => {
    try {
      let formdata = 'username=' + username + '&password=' + password + '&queryParams=%7B%7D'

      const res = await this.axios.post('accounts/login/ajax/', formdata, {
        headers: {
          'accept': '*!/!*',
          'accept-encoding': 'gzip, deflate, br',
          'content-length': formdata.length,
          'content-type': 'application/x-www-form-urlencoded',
          'cookie': 'ig_cb=' + this.essentialValues.ig_cb,
          'x-csrftoken': this.essentialValues.csrftoken,
          'x-instagram-ajax': this.rollout_hash,
          'x-requested-with': 'XMLHttpRequest',
        }
      });

      const headers = res.headers['set-cookie'];

      this.updateEssentialValues(headers);

      return {
        success: true,
        data: this.essentialValues.sessionid
      };
    } catch (e) {
      return {
        success: false,
        error: e
      };
      console.log('Instagram authentication failed (challenge required erro)')
    }
  };


  /**
   * Registration for instagram, returning true or false
   * true if account was successfully created
   * @param {String} username
   * @param {String} password
   * @param {String} name
   * @param {String} email
   * @return {Boolen} account_created
   */
  reg(username, password, name, email) {
    let form = new formData();
    form.append('username', username)
    form.append('password', password)
    form.append('firstname', name)
    form.append('email', email)
    form.append('seamless_login_enabled', '1')

    return fetch('https://www.instagram.com/accounts/web_create_ajax/', {
      'method': 'post',
      'body': form,
      'headers': {
        'referer': 'https://www.instagram.com/',
        'origin': 'https://www.instagram.com',
        'user-agent': this.userAgent,
        'x-instagram-ajax': '1',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrftoken': this.csrfToken,
        cookie: 'csrftoken=' + this.csrfToken
      }
    })
      .then(res => res.json())
      .then(json => {
        //console.log(json.errors);
        return json.account_created;
      })
      .catch(() => console.log('Instagram registration failed'))
  }


  /**
   * I did not want to implement this, but I need a stars on github
   * If you use this library - star this rep https://github.com/yatsenkolesh/instagram-nodejs
   * Thank you, bro
   * Follow/unfollow user by id
   * @param {int} userID
   * @param {boolean} isUnfollow
   * @return {object} Promise of fetch request
   */
  follow(userId, isUnfollow) {
    const headers =
      {
        'referer': 'https://www.instagram.com/',
        'origin': 'https://www.instagram.com',
        'user-agent': this.userAgent,
        'x-instagram-ajax': '1',
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrftoken': undefined,
        cookie: ' sessionid=' + this.sessionId + '; csrftoken=' + this.csrfToken + '; mid=WPL0LQAEAAGG3XL5-xHXzClnpqA3; rur=ASH; mid=WRN1_AAEAAE07QksztCl3OCnLj8Y;'
      }

    return fetch('https://www.instagram.com/web/friendships/' + userId + (isUnfollow == 1 ? '/unfollow' : '/follow'),
      {
        'method': 'post',
        'headers': this.getHeaders()//headers
      }).then(res => {
      return res
    })
  }

  /**
   * @return {Object} default headers
   */
  getHeaders() {
    return {
      'referer': 'https://www.instagram.com/p/BT1ynUvhvaR/?taken-by=yatsenkolesh',
      'origin': 'https://www.instagram.com',
      'user-agent': this.userAgent,
      'x-instagram-ajax': '1',
      'x-requested-with': 'XMLHttpRequest',
      'x-csrftoken': this.essentialValues.csrftoken,
      cookie: ' sessionid=' + this.essentialValues.sessionid + '; csrftoken=' + this.essentialValues.csrftoken + ';'
    }
  }

  /**
   * Return user data by id
   * @param {Int} id
   * @return {Object} promise
   */
  getUserDataById(id) {
    let query = 'ig_user(' + id + '){id,username,external_url,full_name,profile_pic_url,biography,followed_by{count},follows{count},media{count},is_private,is_verified}'

    let form = new formData();
    form.append('q', query)

    return fetch('https://www.instagram.com/query/',
      {
        'method': 'post',
        'body': form,
        'headers': this.getHeaders()
      }).then(res =>
      res.json().then(t => t)
    )
  }

  /**
   * When you pass items counter param instagram create pagination
   * tokens on all iterations and gives on every response end_cursor, which the need to pass on next feed request
   *
   * This method return first "items" posts of feed
   * Coming soon will be opportunity  for get part of feed
   * On testing stage (+- all rights)
   * If you have a problems - create issue : https://github.com/yatsenkolesh/instagram-nodejs
   * @param {Int} items (default - 10)
   * @return {Object} Promise
   */
  getFeed(items, cursor) {
    items = items ? items : 10;
    return fetch('https://www.instagram.com/graphql/query/?query_id=17866917712078875&fetch_media_item_count=' + items + '&fetch_media_item_cursor=' + cursor + '&fetch_comment_count=4&fetch_like=10',
      {
        headers: this.getHeaders(),
      }).then(t =>
      // console.log(t)
      t.json().then(r => r)
    )
  }

  /**
   * Simple variable for get next page
   * @param {Object} json contents from this.getFeed
   * @return {String} if next page is not exists - false
   */
  getFeedNextPage(json) {
    let page = json.data.user.edge_web_feed_timeline.page_info

    return page.has_next_page ? page.end_cursor : false
  }


  like = async (postId) => {
    try {
      const res = await this.axios.post('web/likes/' + postId + '/like/',
        {}, {
          'headers': this.getHeaders()
        });
      if (res.status === 200) {
        return {
          success: true,
          data: postId
        }
      } else {
        throw res;
      }
    } catch (e) {
      return {
        success: false,
        error: e
      }
    }
  };

  unlike = async (postId) => {
    try {
      const res = await this.axios.post('web/likes/' + postId + '/unlike/',
        {}, {
          'headers': this.getHeaders()
        });
      if (res.status === 200) {
        return {
          success: true,
          data: postId
        }
      } else {
        throw res;
      }
    } catch (e) {
      return {
        success: false,
        error: e
      }
    }
  };


  /// https://www.instagram.com/p/BT1ynUvhvaR/
  getMediaInfoByUrl: (url: string) => Promise<ResultFetchMethod<IMediaInfo>> = async (url) => {
    try {
      const res = await this.axios('https://api.instagram.com/oembed/?url=' + url,
        {
          'headers': this.getHeaders()
        });

      if (res.status === 200) {
        return {
          success: true,
          data: res.data,
        }
      }
      throw res;
    } catch (e) {
      return {
        success: false,
        error: e
      }
    }
  };

  /// https://www.instagram.com/p/BT1ynUvhvaR/
  getMediaIdByUrl = async (url) => {
    try {
      const res = await this.getMediaInfoByUrl(url);

      if (!res.success) {
        throw res.error;
      }
      return res.data.media_id.split('_')[0];
    } catch (e) {
      return {
        success: false,
        error: e
      }
    }
  };

  /**
   * Get media user list on userId with pagination
   * @param {String} userId
   * @param {String} cursor (next cursor). Use 0, if you want to get first page
   * @param {Int} mediaCounter default - 12
   * @return {Object} Promise
   */
  getUserMedia = async (userId, cursor = 0, mediaCounter = 12) => {
    let form = new formData()
    form.append('q', 'ig_user(' + userId + ') { media.after(' + cursor + ', ' + mediaCounter + ') {\
    count,\
    nodes {\
      __typename,\
      caption,\
      code,\
      comments {\
        count\
      },\
      comments_disabled,\
      date,\
      dimensions {\
        height,\
        width\
      },\
      display_src,\
      id,\
      is_video,\
      likes {\
        count\
      },\
      owner {\
        id\
      },\
      thumbnail_src,\
      video_views\
    },\
    page_info\
    }\
   }');
    form.append('ref', 'users::show')
    form.append('query_id', '17849115430193904') // this is static id. May be changed after rebuild, but now actually

    try {
      const res = await this.axios.post('query/',
        form, {
          headers: this.getHeaders(),
        });

      console.log(res)
    }
    catch (e) {
      console.log({e})
    }
  };

  /**
   * End cursor - t.entry_data.TagPage[0].tag.media.page_info['end_cursor']
   * Media(nodes) - t.entry_data.TagPage[0].tag.media['nodes']
   * @param {String} searchBy - location, hashtag
   * @param {String} q - location id, or hashtag
   * @param {String} cursor pagination cursor
   * @param {Int} mediaCounter
   * @return {Object} Promise
   */
  searchBy(searchBy, q, cursor, mediaCounter) {
    if (this.searchTypes.indexOf(searchBy) === -1)
      throw 'search type ' + searchBy + ' is not found'

    //exclusion for hashtag if not cursor
    if (searchBy == 'hashtag' && !cursor) {
      return fetch('https://www.instagram.com/explore/tags/' + q + '/',
        {
          headers: this.getHeaders(),
        }).then(t => t.text().then(r => JSON.parse(r.match(/\<script type=\"text\/javascript\">window\._sharedData \=(.*)\;<\//)[1])))
    }

    let form = new formData()
    mediaCounter = mediaCounter ? mediaCounter : 12
    form.append('q', 'ig_' + searchBy + '(' + q + ') { media.after(' + cursor + ', ' + mediaCounter + ') {\
      count,\
      nodes {\
        __typename,\
        caption,\
        code,\
        comments {\
          count\
        },\
        comments_disabled,\
        date,\
        dimensions {\
          height,\
          width\
        },\
        display_src,\
        id,\
        is_video,\
        likes {\
          count\
        },\
        owner {\
          id\
        },\
        thumbnail_src,\
        video_views\
      },\
      page_info\
    }\
     }')

    form.append('ref', 'locations::show')
    form.append('query_id', '') //empty


    return fetch('https://www.instagram.com/query/',
      {
        headers: this.getHeaders(),
        method: 'post',
        body: form
      }).then(t => t.json().then(r => r))
  }

  /**
   * Place id path - r.places[0].place.location['pk'], r.places[1].place.location['pk'], ...
   * Common search returned locations, hashtags and users
   * @param {String} q
   * @return {Object} Promise
   */
  commonSearch(q, rankToken) {
    rankToken = rankToken ? rankToken : ''
    return fetch('https://www.instagram.com/web/search/topsearch/?context=blended&query=' + q + '&rank_token=' + rankToken,
      {
        headers: this.getHeaders() // no required
      }).then(t => t.json().then(r => r))
  }
}

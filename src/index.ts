import express from 'express';
import Instagram from './utils/csrf'

/*
const instagood = require('instagood');
const user = new instagood('kam1cadzee', 'ycJuqbmTpss27ddONUmvqRdRHj6nQZCN', '29130507520%3AjN8esrHZhsU6HH%3A11');
//user.getUserInfo('kam1cadze').then((response: any) => console.log(response), (err: any) => console.log(err));
user.comments('1973268968068413381', 'I liked!').then((response: any) => console.log(response), (err: any) => console.log(err));*/


/*
let Instagram = require('instagram-nodejs-without-api');
Instagram = new Instagram()


Instagram.getCsrfToken().then((csrf: any) => {
  Instagram.csrfToken = csrf;
  console.log(csrf)
}).then(() => {
  return Instagram.auth('vereketa108@gmail.com', '1596VADIMszx9B').then((sessionId: any) => {
    Instagram.sessionId = sessionId
    console.log(sessionId)

    return Instagram.getUserDataByUsername('kam1cadzee').then((t: any) => {
      console.log(t)
      return Instagram.getUserFollowers(t.graphql.user.id).then((t: any) => {
        console.log(t); // - instagram followers for user "username-for-get"
      })
    })

  })
}).catch(console.error);*/

const test = async () => {
  const insg = new Instagram();
  const csrf = await insg.getCsrfToken();

  const sessionId = await insg.auth('kam1cadzee', '1596VADIMszx9B');

  insg.getUserMedia('kam1cadze')
};

test()

const app = express();


app.get('/', (req, res) => {
  res.send('Hello')
});


app.listen(3000, () => {
  console.log('Start server')
});

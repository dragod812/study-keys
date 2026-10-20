import {supportedPage,pageKey} from './core.js';

export function reviewDocument(href=location.href, runtime=globalThis.chrome?.runtime) {
  const u=new URL(href);
  const preview=typeof STUDY_KEYS_PREVIEW!=='undefined'&&STUDY_KEYS_PREVIEW&&u.pathname==='/review.html';
  if(!preview&&(!runtime?.getURL||u.protocol+'//'+u.host+u.pathname!==runtime.getURL('review.html')))return null;
  const target=u.searchParams.get('url');
  return target?.startsWith('file:')&&supportedPage(target)?pageKey(target):null;
}
export function documentURL(){return reviewDocument()||location.href;}

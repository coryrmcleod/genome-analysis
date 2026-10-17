export function externalWebURL(value,localOrigin){
  try{
    const url=new URL(value);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.origin===localOrigin)return null;
    return url.href;
  }catch{return null;}
}

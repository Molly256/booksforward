import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
const P = 'bf:';
const VIPS = {
  0: { books: 5, perBook: 400 },
  1: { books: 5, perBook: 400 },
  2: { books: 10, perBook: 810 },
  3: { books: 15, perBook: 1466 },
  4: { books: 20, perBook: 1500 },
};
function shuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function getUgandaDateString(){return new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Kampala'})}
async function getBooksFromDataJs(){
  const mod = await import('./app/data.js');
  return mod.default || mod.books || mod.BOOKS || []; // FIXED HERE
}
async function assignBooksToUser(phone,vipLevel,today,pipeline){
  const selectedVip=VIPS[vipLevel];
  const allBooks=await getBooksFromDataJs();
  const shuffled=shuffle(allBooks);
  const booksToAssign=shuffled.slice(0,selectedVip.books);
  const unlockedBooks=booksToAssign.map(b=>String(b.bookId || b.id || b._id)); // FIXED HERE
  booksToAssign.forEach(b=>{
    const bookId=String(b.bookId || b.id || b._id); // FIXED HERE
    pipeline.hset(`${P}book:${phone}:${today}:${bookId}`,{
      phone,bookId,vipLevel:String(vipLevel),reward:String(selectedVip.perBook),
      title:b.title,cover:b.cover||`/books/covers/${bookId}.jpg`,status:'pending',
      date:today,createdAt:String(Date.now())
    });
    pipeline.sadd(`${P}books:${phone}:${today}`,bookId);
  });
  return {unlockedBooks};
}
async function seedVipBooks(){
  try{
    const today=getUgandaDateString();
    console.log(`🌍 Date: ${today} | Prefix: ${P}`);
    const userKeys=await redis.keys(`${P}user:*`);
    if(!userKeys.length){console.log('No bf users');return}
    let seeded=0;
    for(const key of userKeys){
      const user=await redis.hgetall(key);
      if(!user?.phone)continue;
      const phone=String(user.phone).trim();
      const hasBoughtVip=user.hasBoughtVip==='true'||user.hasBoughtVip===true;
      const currentVip=Number(user.vip||0);
      if(!hasBoughtVip||currentVip<=0)continue;
      const pipeline=redis.pipeline();
      pipeline.del(`${P}books:${phone}:${today}`);
      const {unlockedBooks}=await assignBooksToUser(phone,currentVip,today,pipeline);
      pipeline.hset(key,{
        unlockedBooks:JSON.stringify(unlockedBooks),
        completedBooks:'[]',
        books_read_today:'0',
        dailyIncome:'0',
        lastResetDate:today,
      });
      await pipeline.exec();
      seeded++;
      console.log(`✅ ${phone} VIP${currentVip} -> ${unlockedBooks.length} books`);
    }
    console.log(`Done seeded ${seeded}`);
  }catch(e){console.error(e)}
}
seedVipBooks();
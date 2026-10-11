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
  return mod.default || mod.books || mod.BOOKS || [];
}
async function assignBooksToUser(phone,vipLevel,today,pipeline){
  const selectedVip=VIPS[vipLevel];
  const allBooks=await getBooksFromDataJs();
  const shuffled=shuffle(allBooks);
  const booksToAssign=shuffled.slice(0,selectedVip.books);
  const unlockedBooks=booksToAssign.map(b=>String(b.bookId || b.id || b._id));
  booksToAssign.forEach(b=>{
    const bookId=String(b.bookId || b.id || b._id);
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
    let skippedNoPhone=0;
    let skippedNoVip=0;
    let skippedNotBought=0;
    let skippedOther=0;

    console.log(`Found ${userKeys.length} user keys to check...`);

    for(const key of userKeys){
      const user=await redis.hgetall(key);
      if(!user?.phone){skippedNoPhone++; continue;}
      const phone=String(user.phone).trim();
      const hasBoughtVip=user.hasBoughtVip==='true'||user.hasBoughtVip===true;
      const currentVip=Number(user.vip||0);
      
      if(!hasBoughtVip){skippedNotBought++; console.log(`⏭️ SKIP ${phone} - not bought vip (hasBoughtVip=${user.hasBoughtVip})`); continue;}
      if(currentVip<=0){skippedNoVip++; console.log(`⏭️ SKIP ${phone} - vip ${currentVip} <=0`); continue;}
      if(!VIPS[currentVip]){skippedOther++; console.log(`⏭️ SKIP ${phone} - vip level ${currentVip} not in VIPS`); continue;}

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
      console.log(`✅ SEEDED ${phone} VIP${currentVip} -> ${unlockedBooks.length} books`);
    }

    console.log(`\n====== SEED REPORT ======`);
    console.log(`✅ Seeded: ${seeded} users`);
    console.log(`⏭️ Skipped (no phone): ${skippedNoPhone}`);
    console.log(`⏭️ Skipped (not bought vip): ${skippedNotBought}`);
    console.log(`⏭️ Skipped (vip <=0): ${skippedNoVip}`);
    console.log(`⏭️ Skipped (other): ${skippedOther}`);
    console.log(`📊 Total checked: ${userKeys.length}`);
    console.log(`========================\n`);

  }catch(e){console.error(e)}
}
seedVipBooks();
const API_URL = "https://eventshublimited.netlify.app/api";

const recommendedGroup = [
  {
    title: "Global Web3 Summit 2026",
    description: "The premier event for Web3 developers, investors, and enthusiasts. Join us to discuss the future of the decentralized web, smart contracts, and dApps.",
    location: "HITEC City, Hyderabad",
    startTime: "2026-10-15T09:00:00",
    endTime: "2026-10-17T18:00:00",
    price: 2999.0,
    totalSeats: 1000,
    imageUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Ethereum Developers Conference",
    description: "A deep dive into Ethereum 2.0, layer 2 scaling solutions, and writing secure solidity smart contracts.",
    location: "Jio World Centre, Mumbai",
    startTime: "2026-10-22T09:00:00",
    endTime: "2026-10-24T18:00:00",
    price: 1500.0,
    totalSeats: 500,
    imageUrl: "https://images.unsplash.com/photo-1622737133809-d95047b9e673?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Solana Hacker House",
    description: "Build the next big thing on Solana. A 5-day intensive hacker house with mentorship from core protocol contributors.",
    location: "Whitefield, Bengaluru",
    startTime: "2026-11-05T10:00:00",
    endTime: "2026-11-10T20:00:00",
    price: 500.0,
    totalSeats: 200,
    imageUrl: "https://images.unsplash.com/photo-1641328080693-018dc3f3e1b0?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Decentralized Finance (DeFi) Expo",
    description: "Explore the cutting edge of decentralized finance, liquidity pools, yield farming, and algorithmic stablecoins.",
    location: "Pragati Maidan, New Delhi",
    startTime: "2026-11-15T09:00:00",
    endTime: "2026-11-16T18:00:00",
    price: 1999.0,
    totalSeats: 800,
    imageUrl: "https://images.unsplash.com/photo-1605792657660-596af9009e82?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Crypto & Blockchain Innovators Summit",
    description: "Networking event for blockchain founders, VCs, and early-stage startup builders looking to disrupt traditional finance.",
    location: "Cyber Hub, Gurugram",
    startTime: "2026-12-01T09:00:00",
    endTime: "2026-12-02T17:00:00",
    price: 1200.0,
    totalSeats: 300,
    imageUrl: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?auto=format&fit=crop&q=80&w=1200"
  }
];

const categories = ["Music", "Art", "Tech", "Food", "Business", "Sports"];
const cities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune"];
const adjectives = ["Global", "Annual", "Exclusive", "Ultimate", "Elite", "Premier"];
const nouns = ["Festival", "Expo", "Summit", "Conference", "Gathering", "Meetup"];

const images = [
  "https://images.unsplash.com/photo-1540575861501-7c001173a270?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1460666819451-7410f5ef1397?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200"
];

const randomEvents = Array.from({ length: 45 }).map((_, i) => {
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const img = images[Math.floor(Math.random() * images.length)];
  
  const dayOffset = Math.floor(Math.random() * 90) + 10;
  const start = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + (Math.random() * 48 + 4) * 60 * 60 * 1000);

  return {
    title: `${adj} ${cat} ${noun} ${2026}`,
    description: `Join us for the most anticipated ${cat.toLowerCase()} event of the year in ${city}. Experience unforgettable moments with industry experts.`,
    location: city,
    startTime: start.toISOString().split('.')[0],
    endTime: end.toISOString().split('.')[0],
    price: Math.floor(Math.random() * 5000) + 500,
    totalSeats: Math.floor(Math.random() * 1000) + 50,
    imageUrl: img
  };
});

const allEvents = [...recommendedGroup, ...randomEvents];

async function seed() {
  console.log("Logging in as admin...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "admin@eventhub.com", password: "admin123" })
  });
  
  if (!loginRes.ok) {
    console.error("Login failed!", await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.data?.token || loginData.data; 

  console.log("Login successful! Token acquired.");
  console.log(`Starting to seed ${allEvents.length} events...`);
  
  let successCount = 0;
  for (let i = 0; i < allEvents.length; i++) {
    const event = allEvents[i];
    try {
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(event)
      });
      
      if (res.ok) {
        successCount++;
        if (i % 5 === 0) console.log(`Inserted ${successCount} events so far...`);
      } else {
        console.error(`Failed to insert event ${i}:`, await res.text());
      }
    } catch (err) {
      console.error(`Error inserting event ${i}:`, err.message);
    }
  }
  
  console.log(`\nSeeding complete! Successfully inserted ${successCount}/${allEvents.length} events.`);
  console.log("The first 5 events are Web3/Crypto themed for testing the ML recommendation engine.");
}

seed();

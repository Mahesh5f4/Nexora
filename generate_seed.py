import random
from datetime import datetime, timedelta

events = []
# 25 General Events
general_titles = [
    "Tech Innovators Summit 2026", "Global Marketing Conference", "Future of AI Workshop",
    "Startup Pitch Night", "Web Development Bootcamp", "Cybersecurity Expo",
    "Cloud Computing Symposium", "Data Science Hackathon", "Product Management Masterclass",
    "Digital Nomad Meetup", "Agile Leadership Retreat", "Design Thinking Workshop",
    "Blockchain Developers Connect", "E-commerce Strategy Summit", "SaaS Founders Dinner",
    "Women in Tech Conference", "Fintech Innovations Expo", "Mobile App Dev Days",
    "AR/VR Future Showcase", "IoT Developer Conference", "Game Developers Gathering",
    "Quantum Computing Intro", "Open Source Contributors Meet", "UX/UI Design Sprint",
    "DevOps Automation Workshop"
]

# 25 Recommendation/Category Events (e.g. Music, Art, Sports)
recommendation_titles = [
    "Summer Music Festival", "Jazz Night Live", "Indie Rock Concert", "Classical Symphony Orchestra",
    "Electronic Dance Party", "Modern Art Exhibition", "Photography Masterclass", "Local Artists Gallery",
    "Abstract Painting Workshop", "Sculpture Showcase", "City Marathon 2026", "Pro Tennis Tournament",
    "Basketball Charity Game", "Yoga in the Park", "Extreme Sports Expo", "Food & Wine Tasting",
    "Craft Beer Festival", "Vegan Cooking Class", "International Food Fair", "Coffee Brewers Meetup",
    "Standup Comedy Night", "Theater Play: The Future", "Film Festival Premiere", "Magic Show Live",
    "Poetry Slam Evening"
]

locations = ["San Francisco, CA", "New York, NY", "London, UK", "Berlin, Germany", "Tokyo, Japan", "Virtual / Online", "Austin, TX", "Toronto, ON"]
images = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
    "https://images.unsplash.com/photo-1501281668745-f7f5792203b2",
    "https://images.unsplash.com/photo-1511578314322-379afb476865",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",
    "https://images.unsplash.com/photo-1522158637959-30385a09e0da",
    "https://images.unsplash.com/photo-1478147427282-58a87a120781"
]

all_titles = general_titles + recommendation_titles

with open("seed.sql", "w") as f:
    f.write("USE ticketbooking;\n")
    for i, title in enumerate(all_titles):
        desc = f"Join us for {title}. This is an amazing event featuring world-class speakers and activities."
        loc = random.choice(locations)
        
        # Start date between tomorrow and 60 days from now
        days_ahead = random.randint(1, 60)
        start_time = datetime.now() + timedelta(days=days_ahead)
        start_time = start_time.replace(hour=random.randint(9, 18), minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=random.randint(2, 8))
        
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
        
        price = round(random.uniform(0, 150), 2)
        total_seats = random.choice([50, 100, 200, 500, 1000])
        avail_seats = random.randint(int(total_seats * 0.2), total_seats)
        img = random.choice(images)
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        sql = f"""INSERT INTO events (deleted, title, description, location, start_time, end_time, price, average_rating, review_count, total_seats, available_seats, version, created_at, updated_at, image_url) VALUES (false, "{title}", "{desc}", "{loc}", '{start_str}', '{end_str}', {price}, 0.0, 0, {total_seats}, {avail_seats}, 0, '{now_str}', '{now_str}', '{img}');\n"""
        f.write(sql)

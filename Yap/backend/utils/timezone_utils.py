from datetime import datetime, timezone, timedelta
import pytz

# Define Eastern Time timezone with automatic DST handling
EASTERN_TZ = pytz.timezone('US/Eastern')

def get_eastern_now():
    """Get current time in Eastern timezone (automatically handles DST)"""
    return datetime.now(EASTERN_TZ)

def convert_to_eastern(dt):
    """Convert a datetime object to Eastern timezone"""
    if dt is None:
        return None
        
    if isinstance(dt, datetime):
        # If no timezone info, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        # Convert to Eastern time
        return dt.astimezone(EASTERN_TZ)
    
    return dt

def format_eastern_timestamp(dt):
    """Format datetime as ISO string in Eastern timezone"""
    if dt is None:
        return None
        
    eastern_dt = convert_to_eastern(dt)
    return eastern_dt.isoformat()

def parse_timestamp(timestamp_str):
    """Parse timestamp string and return datetime object"""
    if not timestamp_str:
        return None
        
    try:
        # Try parsing ISO format
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except:
        try:
            # Fallback to parsing without timezone
            return datetime.fromisoformat(timestamp_str)
        except:
            return None
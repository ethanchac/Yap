from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity
from bson import ObjectId
import re
from datetime import datetime

def validate_json(*required_fields):
    """Decorator to validate JSON input and required fields"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Invalid JSON data'}), 400
            
            missing_fields = []
            for field in required_fields:
                if field not in data or not data[field]:
                    missing_fields.append(field)
            
            if missing_fields:
                return jsonify({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_object_id(id_string):
    """Validate if string is a valid MongoDB ObjectId"""
    try:
        ObjectId(id_string)
        return True
    except:
        return False

def serialize_object_id(obj):
    """Convert ObjectId to string in a document"""
    if isinstance(obj, dict):
        if '_id' in obj:
            obj['id'] = str(obj['_id'])
            del obj['_id']
        for key, value in obj.items():
            if isinstance(value, ObjectId):
                obj[key] = str(value)
            elif isinstance(value, list):
                obj[key] = [serialize_object_id(item) if isinstance(item, dict) else 
                           str(item) if isinstance(item, ObjectId) else item for item in value]
            elif isinstance(value, dict):
                obj[key] = serialize_object_id(value)
    return obj

def paginate_results(collection, query, page=1, per_page=20, sort_field='created_at', sort_order=-1):
    """Paginate MongoDB results"""
    skip = (page - 1) * per_page
    
    cursor = collection.find(query).sort(sort_field, sort_order).skip(skip).limit(per_page)
    results = list(cursor)
    
    total = collection.count_documents(query)
    total_pages = (total + per_page - 1) // per_page
    
    return {
        'results': [serialize_object_id(result) for result in results],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    }

def validate_text_length(text, min_length=1, max_length=280, field_name="Text"):
    """Validate text length"""
    if not text or len(text.strip()) < min_length:
        return False, f"{field_name} must be at least {min_length} character(s) long"
    
    if len(text) > max_length:
        return False, f"{field_name} must be no more than {max_length} characters long"
    
    return True, None

def sanitize_text(text):
    """Basic text sanitization"""
    if not text:
        return ""
    
    # Remove excessive whitespace and normalize
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove any potential HTML/script tags for basic security
    text = re.sub(r'<[^>]*>', '', text)
    
    return text

def format_datetime(dt):
    """Format datetime for API responses"""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

def extract_mentions(text):
    """Extract @mentions from text"""
    mention_pattern = r'@([a-zA-Z0-9_]+)'
    mentions = re.findall(mention_pattern, text)
    return list(set(mentions))  # Remove duplicates

def extract_hashtags(text):
    """Extract #hashtags from text"""
    hashtag_pattern = r'#([a-zA-Z0-9_]+)'
    hashtags = re.findall(hashtag_pattern, text)
    return list(set([tag.lower() for tag in hashtags]))  # Remove duplicates, lowercase

def get_pagination_params(request):
    """Extract pagination parameters from request"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Validate bounds
        page = max(1, page)
        per_page = min(max(1, per_page), 100)  # Max 100 items per page
        
        return page, per_page
    except (ValueError, TypeError):
        return 1, 20

def create_response(data=None, message=None, error=None, status_code=200):
    """Create standardized API response"""
    response = {}
    
    if data is not None:
        response['data'] = data
    
    if message:
        response['message'] = message
    
    if error:
        response['error'] = error
        if status_code == 200:  # If error but no status code specified
            status_code = 400
    
    response['timestamp'] = datetime.utcnow().isoformat()
    
    return jsonify(response), status_code

def requires_user_match(user_field='user_id'):
    """Decorator to ensure the current user matches the specified user field in the URL"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            url_user_id = kwargs.get(user_field)
            
            if current_user_id != url_user_id:
                return jsonify({'error': 'Unauthorized access'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
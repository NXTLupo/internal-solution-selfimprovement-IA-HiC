from flask import Blueprint, request, jsonify
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditAnalysisResult, User
import logging
import uuid
from datetime import datetime
from flask_cors import CORS  # Import CORS

user_bp = Blueprint('user', __name__)
CORS(user_bp)  # Apply CORS to the user blueprint

logger = logging.getLogger(__name__)

@user_bp.route('/projects/<user_id>', methods=['GET'])
def get_user_projects(user_id):
    """Get all projects (analysis results) for a specific user"""
    try:
        db = SessionLocal()
        try:
            # Query all analysis results for this user
            results = db.query(RedditAnalysisResult).filter(
                RedditAnalysisResult.user_id == user_id
            ).all()
            
            # Convert to JSON-serializable format
            projects = []
            for result in results:
                project_data = {
                    'id': result.id,
                    'user_id': result.user_id,
                    'type': result.type,
                    'data': result.data,
                    'created_at': result.created_at.isoformat() if hasattr(result, 'created_at') and result.created_at else None,
                    # Add the metadata fields
                    'subreddit': result.subreddit,
                    'topic': result.topic,
                    'post_count': result.post_count,
                    'sort_by': result.sort_by,
                    'time_period': result.time_period
                }
                projects.append(project_data)
                
            return jsonify(projects)
        except Exception as e:
            logger.error(f"Error fetching user projects: {str(e)}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Server error in get_user_projects: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@user_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user information"""
    try:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({"error": "User not found"}), 404
                
            return jsonify({
                "id": user.id,
                "username": user.username
            })
        except Exception as e:
            logger.error(f"Error fetching user: {str(e)}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Server error in get_user: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@user_bp.route('/project/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get a specific project by ID"""
    try:
        db = SessionLocal()
        try:
            # Query the project
            from app.db.models.reddit_models import RedditAnalysisResult
            
            project = db.query(RedditAnalysisResult).filter(
                RedditAnalysisResult.id == project_id
            ).first()
            
            if not project:
                return jsonify({"error": "Project not found"}), 404
                
            # Convert to JSON-serializable format
            project_data = {
                'id': project.id,
                'user_id': project.user_id,
                'type': project.type,
                'data': project.data,
                'created_at': project.created_at.isoformat() if hasattr(project, 'created_at') and project.created_at else None,
                # Add the metadata fields
                'subreddit': project.subreddit,
                'topic': project.topic,
                'post_count': project.post_count,
                'sort_by': project.sort_by,
                'time_period': project.time_period
            }
                
            return jsonify(project_data)
        except Exception as e:
            logger.error(f"Error fetching project: {str(e)}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Server error in get_project: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@user_bp.route('/projects', methods=['POST'])
def create_project():
    """Create a new empty project"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        project_type = data.get('type')  # 'sentiment' or 'topic'
        
        if not user_id or not project_type:
            return jsonify({"error": "Missing required fields: user_id and type"}), 400
            
        if project_type not in ['sentiment', 'topic']:
            return jsonify({"error": "Invalid project type. Must be 'sentiment' or 'topic'"}), 400
        
        db = SessionLocal()
        try:
            # Check if user exists
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({"error": "User not found"}), 404
                
            # Generate a new project ID
            project_id = str(uuid.uuid4())
            
            # Create empty project with default values
            project = RedditAnalysisResult(
                id=project_id,
                user_id=user_id,
                type=project_type,
                data={},  # Empty data object
                subreddit='',
                topic='',
                post_count=0,
                sort_by='',
                time_period='',
                created_at=datetime.utcnow()
            )
            
            db.add(project)
            db.commit()
            
            return jsonify({
                "id": project_id,
                "user_id": user_id,
                "type": project_type,
                "created_at": project.created_at.isoformat(),
                "message": "Project created successfully"
            })
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating project: {str(e)}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Server error in create_project: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@user_bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project by ID"""
    try:
        db = SessionLocal()
        try:
            # Find the project
            project = db.query(RedditAnalysisResult).filter(
                RedditAnalysisResult.id == project_id
            ).first()
            
            if not project:
                return jsonify({"error": "Project not found"}), 404
            
            # Delete the project
            db.delete(project)
            db.commit()
            
            return jsonify({
                "message": "Project deleted successfully",
                "id": project_id
            })
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting project: {str(e)}")
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Server error in delete_project: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500 
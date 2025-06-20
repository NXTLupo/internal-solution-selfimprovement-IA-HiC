import io
import json
import logging
import os
import re
from typing import Any, Dict, List, Union

import pandas as pd
from pdfminer.high_level import extract_text


class DataProcessor:
    """
    This class processes various data file formats into a unified structure for analysis.
    It includes special handling for interview transcripts and conversation data.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def _process_json(self, file_object: Any) -> Union[Dict[str, Any], List[Any]]:
        """
        Process a JSON file and return the corresponding Python data structure.

        Args:
            file_object: The file-like object representing the JSON file.

        Returns:
            The parsed JSON data (dict or list).
        """
        file_object.seek(0)
        content = file_object.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8')
            
        with open(os.path.join("logs", "raw_json.txt"), "w") as f:
            f.write(content)
            
        try:
            data = json.loads(content)
        except json.JSONDecodeError as json_err:
            self.logger.warning(f"JSON parsing error: {str(json_err)}. Attempting to fix...")
            fixed_content = self._fix_common_json_issues(content)
            data = json.loads(fixed_content)
            
        if isinstance(data, dict):
            journey_keys = [
                'journey', 'phases', 'stages', 'steps', 'touchpoints', 
                'personas', 'emotions', 'satisfaction', 'pain_points', 
                'opportunities'
            ]
            has_journey_keys = any(key in data for key in journey_keys)
            if has_journey_keys:
                self.logger.info("Detected journey-related JSON data")
                return {
                    "data": data,
                    "metadata": {
                        "detected_format": "journey_data",
                        "journey_keys": [key for key in journey_keys if key in data]
                    }
                }
        elif isinstance(data, list) and data:
            if isinstance(data[0], dict):
                journey_keys = [
                    'phase', 'stage', 'step', 'touchpoint', 'emotion', 
                    'satisfaction', 'persona', 'pain_point', 'opportunity'
                ]
                has_journey_keys = any(key in data[0] for key in journey_keys)
                if has_journey_keys:
                    self.logger.info("Detected journey-related JSON data in array format")
                    return {
                        "data": data,
                        "metadata": {
                            "detected_format": "journey_data_array",
                            "journey_keys": [key for key in journey_keys if key in data[0]],
                            "record_count": len(data)
                        }
                    }
        
        return data

    def _process_pdf(self, file_object: Any) -> Union[str, Dict[str, Any]]:
        """
        Extract text from a PDF file using pdfminer and detect structure.

        Args:
            file_object: The file-like object representing the PDF.

        Returns:
            The extracted text or a dictionary with additional transcript elements if detected.
        """
        file_object.seek(0)
        pdf_bytes = io.BytesIO(file_object.read())
        
        try:
            text = extract_text(pdf_bytes)
            
            with open(os.path.join("logs", "extracted_pdf.txt"), "w") as f:
                f.write(text)
            
            if self._is_transcript(text):
                self.logger.info("PDF appears to contain a transcript or conversation.")
                structured_elements = self._process_transcript(text)
                return {
                    "full_text": text,
                    "transcript_elements": structured_elements
                }
            
            journey_terms = [
                'journey', 'map', 'customer', 'user', 'experience', 'touchpoint', 
                'phase', 'stage', 'step', 'emotion', 'satisfaction', 'pain point',
                'opportunity', 'persona'
            ]
            journey_term_count = sum(text.lower().count(term) for term in journey_terms)
            if journey_term_count > 5:
                self.logger.info("PDF appears to contain journey-related content.")
                return {
                    "full_text": text,
                    "journey_related": True,
                    "journey_term_count": journey_term_count
                }
                
            return text
            
        except Exception as pdf_err:
            self.logger.error(f"Error extracting text from PDF: {str(pdf_err)}")
            return f"Error extracting text from PDF: {str(pdf_err)}"

    def _process_text(self, file_object: Any) -> str:
        """
        Process a text file and attempt to detect structure.

        Args:
            file_object: The file-like object representing the text file.

        Returns:
            The processed text, potentially with structured sections if detected.
        """
        file_object.seek(0)
        content = file_object.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8', errors='replace')
            
        os.makedirs("logs", exist_ok=True)
        with open(os.path.join("logs", "raw_text.txt"), "w") as f:
            f.write(content)
            
        if not content or len(content.strip()) < 5:
            self.logger.warning("Text file appears to be empty or contains minimal content")
            return "Empty or minimal content"
            
        if self._is_transcript(content):
            self.logger.info("Text file appears to be a transcript or conversation.")
            structured_content = self._structure_transcript(content)
            if structured_content:
                with open(os.path.join("logs", "structured_transcript.txt"), "w") as f:
                    f.write(structured_content)
                return structured_content
                
        feedback_markers = ["feedback", "review", "satisfaction", "experience with", 
                            "my experience", "rating", "stars", "recommend"]
        is_feedback = any(marker in content.lower() for marker in feedback_markers)
        
        if is_feedback:
            self.logger.info("Text file appears to contain customer feedback or reviews.")
            structured_feedback = self._extract_customer_feedback(content)
            if structured_feedback:
                with open(os.path.join("logs", "structured_feedback.txt"), "w") as f:
                    f.write(structured_feedback)
                return structured_feedback
                
        journey_related = any(marker in content.lower() for marker in [
            "journey", "experience", "stage", "phase", "touchpoint", 
            "customer", "user", "patient", "employee", "satisfaction",
            "pain point", "opportunity", "persona"
        ])
        
        if journey_related:
            self.logger.info("Detected journey-related text content.")
            journey_stages = self._extract_journey_stages(content)
            sections = self._extract_document_sections(content)
            
            if sections or journey_stages:
                formatted_content = "STRUCTURED JOURNEY CONTENT:\n\n"
                
                if journey_stages:
                    formatted_content += "JOURNEY STAGES:\n"
                    for i, stage in enumerate(journey_stages):
                        formatted_content += f"{i+1}. {stage}\n"
                    formatted_content += "\n"
                
                if sections:
                    formatted_content += "CONTENT SECTIONS:\n\n"
                    for section, txt in sections.items():
                        formatted_content += f"## {section} ##\n{txt}\n\n"
                
                with open(os.path.join("logs", "structured_journey.txt"), "w") as f:
                    f.write(formatted_content)
                    
                return formatted_content
                
        return content

    def process_saved_files(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Process files from disk paths rather than file objects.
        
        Args:
            file_paths: A list of file paths to process.
            
        Returns:
            A dictionary containing the processed data.
        """
        file_objects = []
        for file_path in file_paths:
            try:
                # Open the file from disk
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                # Create a file-like object with the content
                file_object = io.BytesIO(content)
                file_object.name = os.path.basename(file_path)
                
                # Add to list of file objects
                file_objects.append(file_object)
                
                # Log successful processing
                self.logger.info(f"Successfully loaded file from disk: {file_path}")
            except Exception as e:
                self.logger.error(f"Error loading file from disk {file_path}: {str(e)}")
                
        return self.process_files(file_objects)

    def process_api_files(self, uploaded_files: List[Any]) -> Dict[str, Any]:
        """
        Process files submitted via the API.

        Args:
            uploaded_files: A list of FastAPI UploadFile objects.

        Returns:
            A dictionary containing the processed data.
        """
        file_objects = []
        for uploaded_file in uploaded_files:
            try:
                # Make sure we're at the beginning of the file
                uploaded_file.file.seek(0)
                
                # Read content from the file
                content = uploaded_file.file.read()
                
                # Create a file-like object from the content
                file_object = io.BytesIO(content)
                file_object.name = uploaded_file.filename
                
                # Add to list of file objects
                file_objects.append(file_object)
                
                # Log successful processing
                self.logger.info(f"Successfully read API file: {uploaded_file.filename}")
            except Exception as e:
                self.logger.error(f"Error reading API file {uploaded_file.filename}: {str(e)}")
                
        # Create a processed data structure with the file objects
        return self.process_files(file_objects)

    def process_files(self, files: List[Any]) -> Dict[str, Any]:
        """
        Process multiple uploaded files of different types.

        Args:
            files: A list of file-like objects.

        Returns:
            A dictionary containing processed structured and unstructured data, along with metadata.
        """
        self.logger.info(f"Processing {len(files)} files.")
        
        # Save debug information
        debug_dir = "logs"
        os.makedirs(debug_dir, exist_ok=True)

        processed_data = {
            "structured": [],
            "unstructured": [],
            "metadata": {
                "file_count": len(files),
                "file_types": {}
            }
        }

        for file_object in files:
            try:
                # Log file information
                self.logger.info(f"Processing file: {file_object.name}")
                
                # Get file extension and update metadata
                file_extension = self._get_file_extension(file_object.name)
                if file_extension in processed_data["metadata"]["file_types"]:
                    processed_data["metadata"]["file_types"][file_extension] += 1
                else:
                    processed_data["metadata"]["file_types"][file_extension] = 1
                
                # Process based on file type
                if file_extension == "csv":
                    data = self._process_csv(file_object)
                    processed_data["structured"].append({
                        "source": file_object.name,
                        "type": "csv",
                        "data": data
                    })
                    self.logger.info(f"Processed CSV file: {file_object.name}")
                    
                    # Save the processed data for debugging
                    try:
                        with open(os.path.join("logs", f"processed_csv_{len(processed_data['structured'])}.json"), "w") as f:
                            json.dump(data, f, indent=2, default=str)
                    except Exception as save_err:
                        self.logger.warning(f"Failed to save debug CSV data: {str(save_err)}")
                        
                elif file_extension == "json":
                    data = self._process_json(file_object)
                    processed_data["structured"].append({
                        "source": file_object.name,
                        "type": "json",
                        "data": data
                    })
                    self.logger.info(f"Processed JSON file: {file_object.name}")
                    
                elif file_extension == "pdf":
                    data = self._process_pdf(file_object)
                    processed_data["unstructured"].append({
                        "source": file_object.name,
                        "type": "pdf",
                        "data": data
                    })
                    self.logger.info(f"Processed PDF file: {file_object.name}")
                    
                    # Save the extracted text for debugging
                    if isinstance(data, str):
                        with open(os.path.join("logs", f"extracted_pdf_{len(processed_data['unstructured'])}.txt"), "w") as f:
                            f.write(data)
                    
                elif file_extension == "txt":
                    data = self._process_text(file_object)
                    
                    # Check if it's a transcript
                    if self._is_transcript(data):
                        structured_data = self._process_transcript(data)
                        processed_data["unstructured"].append({
                            "source": file_object.name,
                            "type": "transcript",
                            "data": data,
                            "structured_elements": structured_data
                        })
                        self.logger.info(f"Processed transcript file: {file_object.name}")
                    else:
                        processed_data["unstructured"].append({
                            "source": file_object.name,
                            "type": "text",
                            "data": data
                        })
                        self.logger.info(f"Processed text file: {file_object.name}")
                    
                    # Save the processed text for debugging
                    with open(os.path.join("logs", f"processed_text_{len(processed_data['unstructured'])}.txt"), "w") as f:
                        f.write(data)
                else:
                    self.logger.warning(f"Unsupported file type: {file_extension}")
                    continue

            except Exception as exception:
                self.logger.error(f"Error processing {file_object.name}: {str(exception)}")
                continue
        
        # Save the complete processed data for debugging
        try:
            with open(os.path.join("logs", "complete_processed_data.json"), "w") as f:
                # We need to handle non-serializable objects when dumping to JSON
                simplify_for_json = lambda obj: str(obj) if not isinstance(obj, (dict, list, str, int, float, bool, type(None))) else obj
                
                def json_safe_dump(obj):
                    if isinstance(obj, dict):
                        return {k: json_safe_dump(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [json_safe_dump(i) for i in obj]
                    else:
                        return simplify_for_json(obj)
                
                safe_data = json_safe_dump(processed_data)
                json.dump(safe_data, f, indent=2)
        except Exception as e:
            self.logger.warning(f"Failed to save complete processed data: {str(e)}")

        return processed_data

    def _get_file_extension(self, filename: str) -> str:
        """
        Extract the file extension from the filename.

        Args:
            filename: The name of the file.

        Returns:
            The file extension in lower case.
        """
        return filename.split(".")[-1].lower()

    def _is_transcript(self, text: str) -> bool:
        """
        Determine if the provided text is an interview or conversation transcript.

        Args:
            text: The text to evaluate.

        Returns:
            True if the text is likely a transcript; otherwise, False.
        """
        transcript_patterns = [
            r'^\s*(?:Speaker|Person|Moderator|Interviewer|Interviewee|Participant|G\d+P\d+)\s*\d*\s*:',
            r'^\s*\[\d{1,2}:\d{2}(?::\d{2})?\]',
            r'^\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?',
            r'^\s*Q\s*:',
            r'^\s*A\s*:',
            r'Transcript|Interview\s+with|Conversation\s+between',
        ]

        timestamp_speaker_pattern = r'\d{1,2}:\d{2}(?::\d{2})?\s+(?:Speaker|Person|Moderator|Interviewer|Interviewee|Participant|G\d+P\d+)'
        lines = text.split('\n')
        transcript_line_count = 0

        for line in lines[:100]:
            for pattern in transcript_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    transcript_line_count += 1
                    break

        timestamp_speaker_matches = re.findall(timestamp_speaker_pattern, text)
        return (transcript_line_count > 5) or (len(timestamp_speaker_matches) > 3)

    def _process_transcript(self, text: str) -> Dict[str, Any]:
        """
        Extract structured data from a transcript.

        Args:
            text: The transcript text.

        Returns:
            A dictionary containing structured elements such as speakers, topics, questions, sentiments, and timestamps.
        """
        lines = text.split('\n')
        structured_data = {
            "speakers": [],
            "topics": [],
            "questions": [],
            "sentiments": [],
            "timestamps": []
        }
        speaker_pattern = r'^\s*((?:Speaker|Person|Moderator|Interviewer|Interviewee|Participant|G\d+P\d+)\s*\d*)\s*:'
        speakers = set()

        for line in lines:
            speaker_match = re.search(speaker_pattern, line)
            if speaker_match:
                speakers.add(speaker_match.group(1).strip())

        structured_data["speakers"] = list(speakers)
        timestamp_pattern = r'^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?'
        for line in lines:
            timestamp_match = re.search(timestamp_pattern, line)
            if timestamp_match:
                structured_data["timestamps"].append(timestamp_match.group(1))

        question_pattern = r'(?:^|\n)(?:.*?:\s*)?((?:What|How|Why|When|Where|Who|Could you|Can you|Do you)[^?]+\?)'
        questions = re.findall(question_pattern, text)
        structured_data["questions"] = [q.strip() for q in questions if len(q.strip()) > 10][:20]

        topic_indicators = [
            r'(?:talk about|discuss|focus on|regarding|about|topic of)\s+([^.,;?!\n]+)',
            r'(?:subject|theme|topic)\s+(?:is|was|of)\s+([^.,;?!\n]+)',
            r'(?:interested in|curious about)\s+([^.,;?!\n]+)'
        ]
        topics = []
        for pattern in topic_indicators:
            matches = re.findall(pattern, text, re.IGNORECASE)
            topics.extend([match.strip() for match in matches if len(match.strip()) > 3])
        structured_data["topics"] = list(set(topics))[:10]

        sentiment_patterns = {
            "positive": [r'(?:happy|pleased|satisfied|great|good|positive|helpful|useful|beneficial|like|love|enjoy|appreciate)'],
            "negative": [r'(?:unhappy|disappointed|frustrated|bad|negative|difficult|challenging|problematic|dislike|hate|annoying|confusing)'],
            "neutral": [r'(?:neutral|okay|fine|acceptable|adequate|so-so|mixed|unclear|uncertain)']
        }
        sentiments = []
        for sentiment, patterns in sentiment_patterns.items():
            count_sum = 0
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                count_sum += len(matches)
            if count_sum > 0:
                sentiments.append({"type": sentiment, "count": count_sum})
        structured_data["sentiments"] = sentiments

        return structured_data

    def _process_csv(self, file_object: Any) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Process a CSV file into a list of dictionaries with journey-related enhancements.

        Args:
            file_object: The file-like object representing the CSV file.

        Returns:
            The parsed data from the CSV file (list of dicts or a dict with 'records' and 'metadata').
        """
        try:
            # Save raw CSV content for debugging
            file_object.seek(0)
            raw_content = file_object.read()
            if isinstance(raw_content, bytes):
                raw_content = raw_content.decode('utf-8')
                
            os.makedirs("logs", exist_ok=True)
            with open(os.path.join("logs", "raw_csv.txt"), "w") as f:
                f.write(raw_content)
                
            # Reset file pointer
            file_object.seek(0)
            
            # Initialize data_frame variable
            data_frame = None
            
            # Try different pandas options to handle various CSV formats
            success = False
            for delimiter in [',', ';', '\t', '|']:
                try:
                    file_object.seek(0)
                    data_frame = pd.read_csv(file_object, delimiter=delimiter)
                    self.logger.info(f"Successfully parsed CSV with delimiter: '{delimiter}'")
                    success = True
                    break
                except Exception as csv_err:
                    self.logger.debug(f"Parsing with delimiter '{delimiter}' failed: {str(csv_err)}")
                    continue
            
            if not success:
                # If all parsing attempts fail, try with different encoding options
                for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']:
                    try:
                        file_object.seek(0)
                        data_frame = pd.read_csv(file_object, encoding=encoding)
                        self.logger.info(f"Successfully parsed CSV with encoding: '{encoding}'")
                        success = True
                        break
                    except Exception as csv_err:
                        self.logger.debug(f"Parsing with encoding '{encoding}' failed: {str(csv_err)}")
                        continue
                        
            if not success:
                # Last attempt: try the content as string directly
                try:
                    import io
                    string_io = io.StringIO(raw_content)
                    data_frame = pd.read_csv(string_io)
                    success = True
                except Exception as csv_err:
                    self.logger.warning(f"All pandas parsing attempts failed: {str(csv_err)}")
                    
            if not success or data_frame is None:
                # If we still can't parse, try manual parsing
                return self._manual_csv_parse(raw_content)
            
            # Successfully parsed the CSV, now process the data
            columns = data_frame.columns.tolist()
            
            # Check for journey-related columns
            journey_related_columns = [
                'journey_stage', 'phase', 'step', 'touchpoint', 'satisfaction',
                'emotion', 'channel', 'persona', 'pain_point', 'opportunity',
                'customer', 'user', 'student', 'patient', 'employee'
            ]
            journey_columns = [col for col in columns if any(journey_term in str(col).lower() for journey_term in journey_related_columns)]
            
            if journey_columns:
                self.logger.info(f"Detected journey-specific CSV format with columns: {journey_columns}")
                metadata = {
                    "detected_format": "journey_data",
                    "journey_columns": journey_columns,
                    "has_satisfaction_data": any('satisfaction' in str(col).lower() for col in columns),
                    "has_emotion_data": any('emotion' in str(col).lower() for col in columns),
                    "has_persona_data": any(term in str(col).lower() for col in columns 
                                            for term in ['persona', 'customer', 'user']),
                    "row_count": len(data_frame)
                }
                
                # Determine journey type based on column content and data values
                journey_type = "general"
                column_text = " ".join(str(col).lower() for col in columns)
                
                # First check columns
                if any(term in column_text for term in ['student', 'education', 'course', 'class']):
                    journey_type = "educational"
                elif any(term in column_text for term in ['patient', 'health', 'medical', 'care']):
                    journey_type = "healthcare"
                elif any(term in column_text for term in ['employee', 'hr', 'staff', 'work']):
                    journey_type = "employee"
                elif any(term in column_text for term in ['shop', 'purchase', 'buy', 'checkout', 'product']):
                    journey_type = "customer_purchase"
                
                # Then check data values for more evidence
                sample_values = []
                for val in data_frame.values.flatten()[:100]:
                    if not pd.isna(val):
                        sample_values.append(str(val))
                sample_text = " ".join(sample_values).lower()
                
                # Refine journey type if necessary based on data content
                journey_keywords = {
                    "customer_purchase": ['cart', 'checkout', 'product', 'shop', 'purchase', 'delivery', 'online', 'shopping'],
                    "educational": ['student', 'course', 'class', 'learn', 'assignment', 'grade', 'teacher', 'professor'],
                    "healthcare": ['patient', 'doctor', 'hospital', 'treatment', 'clinic', 'medical'],
                    "employee": ['employee', 'onboarding', 'manager', 'hr', 'workplace', 'hiring']
                }
                
                # Count keyword matches for each journey type
                type_scores = {
                    j_type: sum(1 for keyword in keywords if keyword in sample_text)
                    for j_type, keywords in journey_keywords.items()
                }
                
                # If we have a strong signal for a different journey type, update it
                highest_score = max(type_scores.values()) if type_scores else 0
                if highest_score > 3:
                    highest_type = max(type_scores.items(), key=lambda x: x[1])[0]
                    journey_type = highest_type
                
                metadata["journey_type"] = journey_type
                
                # Convert to dictionaries but handle NaN/None values properly
                records = []
                for record in data_frame.to_dict(orient="records"):
                    clean_record = {}
                    for k, v in record.items():
                        if pd.isna(v):
                            clean_record[str(k)] = ""
                        else:
                            clean_record[str(k)] = v
                    records.append(clean_record)

                # Save processed data for debugging
                try:
                    with open(os.path.join("logs", "processed_csv_data.json"), "w") as f:
                        json.dump({"records": records, "metadata": metadata}, f, indent=2, default=str)
                except Exception as e:
                    self.logger.warning(f"Failed to save processed CSV data for debugging: {str(e)}")

                # Return as a dictionary with records and metadata
                journey_data: Dict[str, Any] = {
                    "records": records,
                    "metadata": metadata
                }
                return journey_data
            
            # If not journey-specific, convert to standard list of dictionaries
            records: List[Dict[str, Any]] = []
            if data_frame is not None:
                for record in data_frame.to_dict(orient="records"):
                    # Ensure all keys are strings and handle NaN values
                    clean_record = {}
                    for k, v in record.items():
                        if pd.isna(v):
                            clean_record[str(k)] = ""
                        else:
                            clean_record[str(k)] = v
                    records.append(clean_record)
            
            return records
            
        except Exception as exception:
            self.logger.warning(f"Error reading CSV with pandas: {str(exception)}. Trying fallback parsing...")
            try:
                file_object.seek(0)
                content = file_object.read()
                if isinstance(content, bytes):
                    content = content.decode('utf-8', errors='replace')
                return self._manual_csv_parse(content)
            except Exception as manual_error:
                self.logger.error(f"Manual CSV parsing also failed: {str(manual_error)}")
                return []

    def _manual_csv_parse(self, content: str) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Manually parse CSV content when pandas parsing fails.
        
        Args:
            content: The string content of the CSV file.
            
        Returns:
            A list of dictionaries representing the records, or a dict with records and metadata.
        """
        first_line = content.splitlines()[0] if content.splitlines() else ""
        delimiter = ','
        for potential_delimiter in [',', ';', '\t', '|']:
            if potential_delimiter in first_line:
                delimiter = potential_delimiter
                break
                
        lines = content.strip().split('\n')
        if not lines:
            return []
            
        # Parse headers with a regex that handles quotes
        headers = []
        header_line = lines[0]
        header_pattern = r'(?:^|' + re.escape(delimiter) + r')(?:"([^"]*(?:""[^"]*)*)"|([^' + re.escape(delimiter) + r'"]*))'
        for match in re.finditer(header_pattern, header_line):
            field = match.group(1) or match.group(2) or ""
            field = field.strip().replace('""', '"')
            headers.append(field)
            
        if headers and not headers[0]:
            headers = headers[1:]
            
        unique_headers = []
        header_counts = {}
        for header in headers:
            if header in header_counts:
                header_counts[header] += 1
                unique_header = f"{header}_{header_counts[header]}"
                unique_headers.append(unique_header)
            else:
                header_counts[header] = 0
                unique_headers.append(header)
        headers = unique_headers
        
        result: List[Dict[str, Any]] = []
        for i in range(1, len(lines)):
            line = lines[i].strip()
            if not line:
                continue
                
            row_values = []
            in_quotes = False
            current_field = ""
            
            for idx, char in enumerate(line + delimiter):
                prev_chars = line[idx-1:idx+1] if idx > 0 and idx < len(line) else ""
                if char == '"' and (not in_quotes or (in_quotes and prev_chars != '""')):
                    in_quotes = not in_quotes
                elif char == delimiter and not in_quotes:
                    row_values.append(current_field.strip())
                    current_field = ""
                else:
                    current_field += char
            
            if not row_values:
                row_values = []
                for match in re.finditer(header_pattern, line):
                    field = match.group(1) or match.group(2) or ""
                    field = field.strip().replace('""', '"')
                    row_values.append(field)
                
            if row_values and not row_values[0] and len(row_values) > len(headers):
                row_values = row_values[1:]
            if len(row_values) > len(headers):
                row_values = row_values[:len(headers)]
            elif len(row_values) < len(headers):
                row_values.extend([""] * (len(headers) - len(row_values)))
                
            row = {}
            for j in range(len(headers)):
                if j < len(row_values):
                    row[headers[j]] = row_values[j]
                else:
                    row[headers[j]] = ""
            result.append(row)
        
        self.logger.info(f"Successfully manually parsed CSV with {len(result)} records")
        
        journey_related_columns = [
            'journey_stage', 'phase', 'step', 'touchpoint', 'satisfaction',
            'emotion', 'channel', 'persona', 'pain_point', 'opportunity'
        ]
        
        if result and len(result) > 0:
            col_keys = list(result[0].keys())
            has_journey_columns = any(
                any(journey_term in str(col).lower() for journey_term in journey_related_columns) 
                for col in col_keys if isinstance(col, str)
            )
            
            if has_journey_columns:
                journey_columns = [
                    col for col in col_keys 
                    if isinstance(col, str) and any(
                        journey_term in col.lower() 
                        for journey_term in journey_related_columns
                    )
                ]
                
                metadata: Dict[str, Any] = {
                    "detected_format": "journey_data",
                    "journey_columns": journey_columns,
                    "parsing_method": "manual",
                    "row_count": len(result)
                }
                
                journey_data: Dict[str, Any] = {
                    "records": result,
                    "metadata": metadata
                }
                return journey_data
            
        return result

    def _fix_common_json_issues(self, content: str) -> str:
        """Fix common JSON formatting issues that might prevent parsing"""
        fixed_json = ""
        in_double_quotes = False
        
        for char in content:
            if char == '"':
                in_double_quotes = not in_double_quotes
                fixed_json += char
            elif char == "'" and not in_double_quotes:
                fixed_json += '"'
            else:
                fixed_json += char
        
        fixed_json = re.sub(r'([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', fixed_json)
        fixed_json = re.sub(r',\s*([}\]])', r'\1', fixed_json)
        fixed_json = re.sub(r'(["\d])\s*\n\s*"', r'\1,\n"', fixed_json)
        fixed_json = re.sub(r':\s*([a-zA-Z][a-zA-Z0-9_]*)(?=\s*[,}])', r':"\1"', fixed_json)
        
        return fixed_json

    def _structure_transcript(self, text: str) -> str:
        speaker_pattern = r'^\s*((?:Speaker|Person|Moderator|Interviewer|Interviewee|Participant|G\d+P\d+)\s*\d*)\s*:'
        speakers = set()
        for line in text.split('\n'):
            speaker_match = re.search(speaker_pattern, line)
            if speaker_match:
                speakers.add(speaker_match.group(1).strip())
        
        sections = self._extract_document_sections(text)
        question_pattern = r'(?:^|\n)(?:.*?:\s*)?((?:What|How|Why|When|Where|Who|Could you|Can you|Do you)[^?]+\?)'
        questions = re.findall(question_pattern, text)
        
        if speakers or sections or questions:
            formatted_text = "STRUCTURED TRANSCRIPT:\n\n"
            if speakers:
                formatted_text += "PARTICIPANTS:\n"
                for speaker in speakers:
                    formatted_text += f"- {speaker}\n"
                formatted_text += "\n"
                
            if questions and len(questions) > 3:
                formatted_text += "KEY QUESTIONS:\n"
                for question in questions[:10]:
                    if len(question.strip()) > 10:
                        formatted_text += f"- {question.strip()}\n"
                formatted_text += "\n"
                
            if sections:
                formatted_text += "CONVERSATION SEGMENTS:\n\n"
                for section, content in sections.items():
                    formatted_text += f"## {section} ##\n{content}\n\n"
            else:
                formatted_text += "FULL TRANSCRIPT:\n\n" + text
                
            return formatted_text
            
        return text

    def _extract_customer_feedback(self, text: str) -> str:
        sections = self._extract_document_sections(text)
        
        sentiments = []
        sentiment_patterns = {
            "positive": ["excellent", "great", "good", "love", "helpful", "recommend",
                         "impressed", "satisfied", "happy", "liked", "enjoyed"],
            "negative": ["disappointed", "poor", "bad", "terrible", "awful", "frustrating", 
                         "difficult", "unhappy", "disliked", "hate", "waste", "problem"],
            "neutral": ["okay", "average", "neutral", "mixed", "fine", "acceptable", "fair"]
        }
        
        paragraphs = text.split('\n\n')
        paragraph_sentiments = []
        
        for i, paragraph in enumerate(paragraphs):
            paragraph_text = paragraph.lower()
            sentiment_scores = {
                "positive": sum(paragraph_text.count(term) for term in sentiment_patterns["positive"]),
                "negative": sum(paragraph_text.count(term) for term in sentiment_patterns["negative"]),
                "neutral": sum(paragraph_text.count(term) for term in sentiment_patterns["neutral"])
            }
            
            if sentiment_scores["positive"] > sentiment_scores["negative"] and sentiment_scores["positive"] > sentiment_scores["neutral"]:
                dominant = "positive"
            elif sentiment_scores["negative"] > sentiment_scores["positive"] and sentiment_scores["negative"] > sentiment_scores["neutral"]:
                dominant = "negative"
            else:
                dominant = "neutral"
                
            paragraph_sentiments.append({
                "paragraph": i,
                "sentiment": dominant,
                "scores": sentiment_scores
            })
            
        overall_rating = None
        rating_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*(\d+)',
            r'(\d+(?:\.\d+)?)\s*stars?',
            r'rating\s*:?\s*(\d+(?:\.\d+)?)',
            r'score\s*:?\s*(\d+(?:\.\d+)?)',
            r'overall\s*:?\s*(\d+(?:\.\d+)?)'
        ]
        
        for pattern in rating_patterns:
            matches = re.search(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    if len(matches.groups()) > 1:
                        numerator = float(matches.group(1))
                        denominator = float(matches.group(2))
                        overall_rating = (numerator / denominator) * 100
                    else:
                        rating = float(matches.group(1))
                        if rating <= 5:
                            overall_rating = (rating / 5) * 100
                        else:
                            overall_rating = (rating / 10) * 100
                    break
                except (ValueError, ZeroDivisionError):
                    pass
        
        pain_point_phrases = [
            r'(?:frustrat(?:ing|ed)|problem|issue|difficult|confusing|annoying|disappointed)(?:[^.]*)',
            r'(?:wish|should|could have|needs to)(?:[^.]*)',
            r'(?:problems?|issues?)\s+with(?:[^.]*)'
        ]
        
        highlight_phrases = [
            r'(?:great|excellent|impressive|love|enjoy|like)(?:[^.]*)',
            r'(?:works well|very good|impressive|helpful)(?:[^.]*)',
            r'(?:happy with|satisfied with|pleased with)(?:[^.]*)'
        ]
        
        pain_points = []
        for pattern in pain_point_phrases:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                pain_point = match.group(0).strip()
                if len(pain_point) > 10 and pain_point not in pain_points:
                    pain_points.append(pain_point)
        
        highlights = []
        for pattern in highlight_phrases:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                highlight = match.group(0).strip()
                if len(highlight) > 10 and highlight not in highlights:
                    highlights.append(highlight)
        
        structured_feedback = "STRUCTURED CUSTOMER FEEDBACK:\n\n"
        
        if overall_rating is not None:
            structured_feedback += f"OVERALL RATING: {overall_rating:.0f}%\n\n"
        
        if paragraph_sentiments:
            structured_feedback += "SENTIMENT ANALYSIS:\n"
            for ps in paragraph_sentiments:
                sentiment_icon = "😊" if ps["sentiment"] == "positive" else ("😐" if ps["sentiment"] == "neutral" else "😞")
                paragraph_num = ps["paragraph"] + 1
                structured_feedback += f"Paragraph {paragraph_num}: {sentiment_icon} {ps['sentiment'].title()}\n"
            structured_feedback += "\n"
        
        if pain_points:
            structured_feedback += "PAIN POINTS:\n"
            for point in pain_points[:5]:
                structured_feedback += f"- {point}\n"
            structured_feedback += "\n"
        
        if highlights:
            structured_feedback += "HIGHLIGHTS:\n"
            for highlight in highlights[:5]:
                structured_feedback += f"+ {highlight}\n"
            structured_feedback += "\n"
        
        if sections:
            structured_feedback += "FEEDBACK SECTIONS:\n\n"
            for section, content_section in sections.items():
                structured_feedback += f"## {section} ##\n{content_section}\n\n"
        else:
            structured_feedback += "FULL CONTENT:\n\n" + text
        
        return structured_feedback

    def _extract_journey_stages(self, text: str) -> List[str]:
        stage_patterns = [
            r'(?:^|\n)\s*(\d+\.?\s+[A-Z][^.,\n]+)',
            r'(?:^|\n)\s*([A-Z][A-Za-z\s]+):\s*\n',
            r'(?:^|\n)\s*([A-Z][^:.\n]+):\s*([^\n]+)',
            r'(?:^|\n)\s*((?:Initial|First|Start|Begin|Early|Research|Discovery|Awareness|Consideration|Decision|Purchase|Buying|Checkout|Post[- ]Purchase|Delivery|Support|Service|Follow[- ]Up)[^.,\n]+)'
        ]
        
        stages = []
        for pattern in stage_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                stage = match.group(1).strip() if match.group(1) else match.group(0).strip()
                if len(stage) > 3 and not any(existing.lower() == stage.lower() for existing in stages):
                    stages.append(stage)
        
        if not stages and "\n\n" in text:
            paragraphs = text.split("\n\n")
            potential_stages = []
            
            for paragraph in paragraphs:
                first_line = paragraph.split("\n")[0].strip()
                if len(first_line) > 0 and len(first_line) < 60 and first_line.endswith(":"):
                    potential_stage = first_line.rstrip(":")
                    potential_stages.append(potential_stage)
                elif len(first_line) > 0 and len(first_line) < 60 and all(c.isalpha() or c.isspace() for c in first_line):
                    potential_stages.append(first_line)
            
            if potential_stages:
                stages = potential_stages[:5]
        
        return stages

    def _extract_document_sections(self, text: str) -> Dict[str, str]:
        sections = {}
        header_patterns = [
            r'^([^\n]+)\n[=\-~]{3,}\n',
            r'^#+\s+([^\n]+)\n',
            r'^\d+\.\s+([^\n]+)\n',
            r'^[A-Z][A-Z\s]+[A-Z]$\n'
        ]
        
        for pattern in header_patterns:
            for match in re.finditer(pattern, text, re.MULTILINE):
                header = match.group(1).strip()
                start_position = match.end()
                next_match = re.search(pattern, text[start_position:], re.MULTILINE)
                if next_match:
                    end_position = start_position + next_match.start()
                    section_content = text[start_position:end_position].strip()
                else:
                    section_content = text[start_position:].strip()
                    
                sections[header] = section_content
                
        if not sections:
            paragraphs = re.split(r'\n\s*\n', text)
            if len(paragraphs) > 1:
                for i, paragraph in enumerate(paragraphs[:5]):
                    sections[f"Paragraph {i + 1}"] = paragraph.strip()
                    
        return sections

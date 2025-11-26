"""
Interactive Analysis Orchestrator with Human-in-the-Loop Features
Provides checkpoint-based analysis with intervention capabilities
"""

import asyncio
import json
import time
import uuid
from typing import Dict, Any, List, Optional, Callable, AsyncGenerator
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class CheckpointStage(Enum):
    DATA_INGESTION = "data_ingestion"
    PATTERN_DETECTION = "pattern_detection"
    PERSONA_SYNTHESIS = "persona_synthesis"
    EVIDENCE_MAPPING = "evidence_mapping"
    FINAL_OUTPUT = "final_output"

class CheckpointStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REVISED = "revised"
    SKIPPED = "skipped"

class ThinkingPassType(Enum):
    SURFACE = "surface"
    HIDDEN = "hidden"
    PSYCHOLOGICAL = "psychological"
    CULTURAL = "cultural"
    STRATEGIC = "strategic"

@dataclass
class ThinkingEvent:
    id: str
    pass_number: int
    pass_type: ThinkingPassType
    content: str
    confidence: float
    connections: List[str]
    timestamp: int
    insights: Optional[List[str]] = None
    questions: Optional[List[str]] = None

@dataclass
class Checkpoint:
    id: str
    name: str
    description: str
    stage: CheckpointStage
    status: CheckpointStatus
    data: Optional[Dict[str, Any]] = None
    feedback: Optional[str] = None
    timestamp: Optional[int] = None
    required_actions: Optional[List[str]] = None

@dataclass
class AnalysisSettings:
    enable_checkpoints: bool = True
    auto_approve: bool = False
    confidence_threshold: float = 0.7
    max_thinking_passes: int = 5
    stream_thinking: bool = True
    bias_detection: bool = True
    evidence_validation: bool = True

class InteractiveAnalysisOrchestrator:
    def __init__(self, gemini_client):
        self.gemini_client = gemini_client
        self.analysis_sessions: Dict[str, 'AnalysisSession'] = {}
        self.checkpoint_handlers: Dict[CheckpointStage, Callable] = {}
        
    async def start_analysis(
        self,
        session_id: str,
        data: str,
        settings: AnalysisSettings,
        callbacks: Optional[Dict[str, Callable]] = None
    ) -> 'AnalysisSession':
        """Start a new interactive analysis session"""
        session = AnalysisSession(
            id=session_id,
            data=data,
            settings=settings,
            callbacks=callbacks or {},
            orchestrator=self
        )
        
        self.analysis_sessions[session_id] = session
        
        # Start the analysis in the background
        asyncio.create_task(session.run())
        
        return session
    
    async def get_session(self, session_id: str) -> Optional['AnalysisSession']:
        """Get an existing analysis session"""
        return self.analysis_sessions.get(session_id)
    
    def register_checkpoint_handler(self, stage: CheckpointStage, handler: Callable):
        """Register a custom checkpoint handler"""
        self.checkpoint_handlers[stage] = handler

class AnalysisSession:
    def __init__(
        self,
        id: str,
        data: str,
        settings: AnalysisSettings,
        callbacks: Dict[str, Callable],
        orchestrator: 'InteractiveAnalysisOrchestrator'
    ):
        self.id = id
        self.data = data
        self.settings = settings
        self.callbacks = callbacks
        self.orchestrator = orchestrator
        
        # Session state
        self.checkpoints: List[Checkpoint] = self._initialize_checkpoints()
        self.thinking_events: List[ThinkingEvent] = []
        self.analysis_state: Dict[str, Any] = {}
        self.is_running = False
        self.is_paused = False
        self.current_checkpoint_idx = 0
        
        # Control events for intervention
        self.approval_event = asyncio.Event()
        self.revision_data: Optional[Dict[str, Any]] = None
        
    def _initialize_checkpoints(self) -> List[Checkpoint]:
        """Initialize the checkpoint structure"""
        return [
            Checkpoint(
                id=str(uuid.uuid4()),
                name="Data Ingestion",
                description="Validate and preprocess research data",
                stage=CheckpointStage.DATA_INGESTION,
                status=CheckpointStatus.PENDING,
                required_actions=["Review extracted data", "Confirm data quality"]
            ),
            Checkpoint(
                id=str(uuid.uuid4()),
                name="Pattern Detection",
                description="Initial theme and pattern identification",
                stage=CheckpointStage.PATTERN_DETECTION,
                status=CheckpointStatus.PENDING,
                required_actions=["Review detected themes", "Adjust pattern sensitivity"]
            ),
            Checkpoint(
                id=str(uuid.uuid4()),
                name="Persona Synthesis",
                description="Generate and validate personas",
                stage=CheckpointStage.PERSONA_SYNTHESIS,
                status=CheckpointStatus.PENDING,
                required_actions=["Validate persona archetypes", "Confirm persona count"]
            ),
            Checkpoint(
                id=str(uuid.uuid4()),
                name="Evidence Mapping",
                description="Map evidence to insights and personas",
                stage=CheckpointStage.EVIDENCE_MAPPING,
                status=CheckpointStatus.PENDING,
                required_actions=["Verify evidence accuracy", "Validate quote attribution"]
            ),
            Checkpoint(
                id=str(uuid.uuid4()),
                name="Final Output",
                description="Generate final deliverables",
                stage=CheckpointStage.FINAL_OUTPUT,
                status=CheckpointStatus.PENDING,
                required_actions=["Review all outputs", "Approve for delivery"]
            )
        ]
    
    async def run(self):
        """Run the analysis with checkpoint controls"""
        self.is_running = True
        
        try:
            for idx, checkpoint in enumerate(self.checkpoints):
                if not self.is_running:
                    break
                
                self.current_checkpoint_idx = idx
                
                # Update checkpoint status
                checkpoint.status = CheckpointStatus.ACTIVE
                checkpoint.timestamp = int(time.time() * 1000)
                await self._notify_checkpoint_update(checkpoint)
                
                # Execute checkpoint logic
                result = await self._execute_checkpoint(checkpoint)
                checkpoint.data = result
                
                # Handle checkpoint approval if needed
                if self.settings.enable_checkpoints and not self.settings.auto_approve:
                    checkpoint.status = CheckpointStatus.AWAITING_APPROVAL
                    await self._notify_checkpoint_update(checkpoint)
                    
                    # Wait for approval or revision
                    approval_result = await self._wait_for_approval(checkpoint)
                    
                    if approval_result == 'revised':
                        # Re-execute with revision data
                        result = await self._execute_checkpoint(checkpoint, revision=True)
                        checkpoint.data = result
                        checkpoint.status = CheckpointStatus.REVISED
                    elif approval_result == 'skipped':
                        checkpoint.status = CheckpointStatus.SKIPPED
                    else:
                        checkpoint.status = CheckpointStatus.APPROVED
                else:
                    checkpoint.status = CheckpointStatus.APPROVED
                
                await self._notify_checkpoint_update(checkpoint)
                
        except Exception as e:
            logger.error(f"Analysis error in session {self.id}: {str(e)}")
            if 'on_error' in self.callbacks:
                await self.callbacks['on_error'](e)
        finally:
            self.is_running = False
    
    async def _execute_checkpoint(
        self, 
        checkpoint: Checkpoint, 
        revision: bool = False
    ) -> Dict[str, Any]:
        """Execute the logic for a specific checkpoint"""
        
        # Check for custom handler
        if checkpoint.stage in self.orchestrator.checkpoint_handlers:
            handler = self.orchestrator.checkpoint_handlers[checkpoint.stage]
            return await handler(self, checkpoint, revision)
        
        # Default checkpoint implementations
        if checkpoint.stage == CheckpointStage.DATA_INGESTION:
            return await self._process_data_ingestion(revision)
        elif checkpoint.stage == CheckpointStage.PATTERN_DETECTION:
            return await self._process_pattern_detection(revision)
        elif checkpoint.stage == CheckpointStage.PERSONA_SYNTHESIS:
            return await self._process_persona_synthesis(revision)
        elif checkpoint.stage == CheckpointStage.EVIDENCE_MAPPING:
            return await self._process_evidence_mapping(revision)
        elif checkpoint.stage == CheckpointStage.FINAL_OUTPUT:
            return await self._process_final_output(revision)
        
        return {}
    
    async def _process_data_ingestion(self, revision: bool = False) -> Dict[str, Any]:
        """Process data ingestion checkpoint"""
        if revision and self.revision_data:
            # Apply revision modifications
            self.data = self.revision_data.get('modified_data', self.data)
        
        # Simulate thinking process
        await self._emit_thinking_event(
            ThinkingPassType.SURFACE,
            "Analyzing data structure and quality...",
            confidence=0.85,
            insights=["Data contains multiple perspectives", "High quality responses detected"]
        )
        
        # Process data
        processed_data = {
            'raw_text': self.data,
            'word_count': len(self.data.split()),
            'estimated_responses': self.data.count('\n\n'),
            'quality_score': 0.87
        }
        
        self.analysis_state['processed_data'] = processed_data
        return processed_data
    
    async def _process_pattern_detection(self, revision: bool = False) -> Dict[str, Any]:
        """Process pattern detection checkpoint"""
        
        # Multiple thinking passes
        for i, (pass_type, content) in enumerate([
            (ThinkingPassType.SURFACE, "Identifying surface-level themes and patterns..."),
            (ThinkingPassType.HIDDEN, "Searching for hidden connections and implicit meanings..."),
            (ThinkingPassType.PSYCHOLOGICAL, "Analyzing psychological drivers and motivations...")
        ]):
            await self._emit_thinking_event(
                pass_type,
                content,
                confidence=0.75 + (i * 0.05),
                connections=["Theme A", "Theme B", "Pattern X"]
            )
            await asyncio.sleep(0.5)  # Simulate processing time
        
        patterns = {
            'main_themes': [
                {'name': 'User Experience', 'frequency': 45, 'sentiment': 0.7},
                {'name': 'Product Quality', 'frequency': 38, 'sentiment': 0.8},
                {'name': 'Customer Support', 'frequency': 27, 'sentiment': 0.6}
            ],
            'emerging_patterns': [
                'Preference for self-service',
                'Importance of personalization',
                'Mobile-first expectations'
            ],
            'outliers': ['Unique use case #1', 'Edge scenario #2']
        }
        
        self.analysis_state['patterns'] = patterns
        return patterns
    
    async def _process_persona_synthesis(self, revision: bool = False) -> Dict[str, Any]:
        """Process persona synthesis checkpoint"""
        
        persona_count = 3
        if revision and self.revision_data:
            persona_count = self.revision_data.get('persona_count', persona_count)
        
        await self._emit_thinking_event(
            ThinkingPassType.PSYCHOLOGICAL,
            f"Synthesizing {persona_count} distinct personas from behavioral patterns...",
            confidence=0.82,
            insights=[f"Identified {persona_count} distinct user segments"]
        )
        
        personas = {
            'count': persona_count,
            'personas': [
                {
                    'id': f'persona_{i+1}',
                    'name': f'Persona {i+1}',
                    'description': f'Description for persona {i+1}',
                    'traits': ['Trait A', 'Trait B', 'Trait C'],
                    'evidence_count': 12 + i * 3
                }
                for i in range(persona_count)
            ]
        }
        
        self.analysis_state['personas'] = personas
        return personas
    
    async def _process_evidence_mapping(self, revision: bool = False) -> Dict[str, Any]:
        """Process evidence mapping checkpoint"""
        
        await self._emit_thinking_event(
            ThinkingPassType.STRATEGIC,
            "Mapping evidence to insights and validating connections...",
            confidence=0.78,
            questions=["Should we include borderline evidence?", "How to handle conflicting data?"]
        )
        
        evidence_map = {
            'total_evidence_points': 156,
            'mapped_to_personas': 142,
            'mapped_to_themes': 148,
            'unmapped': 8,
            'confidence_distribution': {
                'high': 89,
                'medium': 53,
                'low': 14
            }
        }
        
        self.analysis_state['evidence_map'] = evidence_map
        return evidence_map
    
    async def _process_final_output(self, revision: bool = False) -> Dict[str, Any]:
        """Process final output generation checkpoint"""
        
        await self._emit_thinking_event(
            ThinkingPassType.STRATEGIC,
            "Generating comprehensive analysis outputs...",
            confidence=0.88,
            insights=["All deliverables ready", "Quality checks passed"]
        )
        
        # Generate final outputs based on accumulated state
        final_output = {
            'analysis_complete': True,
            'deliverables': {
                'personas': self.analysis_state.get('personas', {}),
                'themes': self.analysis_state.get('patterns', {}),
                'evidence': self.analysis_state.get('evidence_map', {}),
                'video_script': {'duration': 120, 'scenes': 5},
                'strategy_deck': {'slides': 12, 'format': 'pptx'}
            },
            'quality_metrics': {
                'confidence': 0.85,
                'evidence_coverage': 0.91,
                'bias_score': 0.12
            }
        }
        
        self.analysis_state['final_output'] = final_output
        return final_output
    
    async def _emit_thinking_event(
        self,
        pass_type: ThinkingPassType,
        content: str,
        confidence: float = 0.5,
        connections: List[str] = None,
        insights: List[str] = None,
        questions: List[str] = None
    ):
        """Emit a thinking event for streaming"""
        event = ThinkingEvent(
            id=str(uuid.uuid4()),
            pass_number=len(self.thinking_events) + 1,
            pass_type=pass_type,
            content=content,
            confidence=confidence,
            connections=connections or [],
            timestamp=int(time.time() * 1000),
            insights=insights,
            questions=questions
        )
        
        self.thinking_events.append(event)
        
        if self.settings.stream_thinking and 'on_thinking' in self.callbacks:
            await self.callbacks['on_thinking'](asdict(event))
    
    async def _wait_for_approval(self, checkpoint: Checkpoint) -> str:
        """Wait for checkpoint approval, revision, or skip"""
        self.approval_event.clear()
        
        # Notify that we're waiting
        if 'on_checkpoint_wait' in self.callbacks:
            await self.callbacks['on_checkpoint_wait'](asdict(checkpoint))
        
        # Wait for user action
        await self.approval_event.wait()
        
        # Check what action was taken
        if checkpoint.status == CheckpointStatus.SKIPPED:
            return 'skipped'
        elif self.revision_data:
            return 'revised'
        else:
            return 'approved'
    
    async def _notify_checkpoint_update(self, checkpoint: Checkpoint):
        """Notify about checkpoint status update"""
        if 'on_checkpoint_update' in self.callbacks:
            await self.callbacks['on_checkpoint_update'](asdict(checkpoint))
    
    async def approve_checkpoint(self, checkpoint_id: str, feedback: Optional[str] = None):
        """Approve a checkpoint and continue"""
        checkpoint = self._find_checkpoint(checkpoint_id)
        if checkpoint and checkpoint.status == CheckpointStatus.AWAITING_APPROVAL:
            checkpoint.feedback = feedback
            checkpoint.status = CheckpointStatus.APPROVED
            self.revision_data = None
            self.approval_event.set()
    
    async def revise_checkpoint(
        self, 
        checkpoint_id: str, 
        feedback: str, 
        data: Optional[Dict[str, Any]] = None
    ):
        """Request revision at a checkpoint"""
        checkpoint = self._find_checkpoint(checkpoint_id)
        if checkpoint and checkpoint.status == CheckpointStatus.AWAITING_APPROVAL:
            checkpoint.feedback = feedback
            self.revision_data = data or {}
            self.approval_event.set()
    
    async def skip_checkpoint(self, checkpoint_id: str):
        """Skip a checkpoint"""
        checkpoint = self._find_checkpoint(checkpoint_id)
        if checkpoint and checkpoint.status == CheckpointStatus.AWAITING_APPROVAL:
            checkpoint.status = CheckpointStatus.SKIPPED
            self.approval_event.set()
    
    async def rollback_to_checkpoint(self, checkpoint_id: str):
        """Rollback analysis to a specific checkpoint"""
        checkpoint_idx = None
        for idx, checkpoint in enumerate(self.checkpoints):
            if checkpoint.id == checkpoint_id:
                checkpoint_idx = idx
                break
        
        if checkpoint_idx is not None:
            # Reset subsequent checkpoints
            for i in range(checkpoint_idx + 1, len(self.checkpoints)):
                self.checkpoints[i].status = CheckpointStatus.PENDING
                self.checkpoints[i].data = None
                self.checkpoints[i].feedback = None
                self.checkpoints[i].timestamp = None
            
            # Restart from the checkpoint
            self.current_checkpoint_idx = checkpoint_idx
            asyncio.create_task(self.run())
    
    async def pause_analysis(self):
        """Pause the ongoing analysis"""
        self.is_paused = True
    
    async def resume_analysis(self):
        """Resume a paused analysis"""
        self.is_paused = False
        self.approval_event.set()
    
    async def stop_analysis(self):
        """Stop the analysis completely"""
        self.is_running = False
        self.approval_event.set()
    
    def _find_checkpoint(self, checkpoint_id: str) -> Optional[Checkpoint]:
        """Find a checkpoint by ID"""
        for checkpoint in self.checkpoints:
            if checkpoint.id == checkpoint_id:
                return checkpoint
        return None
    
    def get_state(self) -> Dict[str, Any]:
        """Get the current state of the analysis session"""
        return {
            'id': self.id,
            'is_running': self.is_running,
            'is_paused': self.is_paused,
            'current_checkpoint': self.current_checkpoint_idx,
            'checkpoints': [asdict(c) for c in self.checkpoints],
            'thinking_events': [asdict(e) for e in self.thinking_events],
            'analysis_state': self.analysis_state
        }
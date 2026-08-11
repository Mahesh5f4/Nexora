from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.api.auth_middleware import verify_internal_token
from app.services.rag_service import RAGService
from app.services.document_processing_service import DocumentProcessingService
from app.dependencies import get_rag_service
from app.models.retrieval import RetrievalRequest, RetrievalResponse, RetrievedChunkModel
from app.models.rag_answer import RagAnswerRequest, RagAnswerResponse

router = APIRouter(
    prefix="/internal/rag",
    tags=["Internal RAG APIs"],
    dependencies=[Depends(verify_internal_token)]
)

processing_service = DocumentProcessingService()

@router.post("/index")
async def index_document(
    documentId: str = Form(...),
    userId: str = Form(...),
    filename: str = Form(...),
    contentType: str = Form(...),
    file: UploadFile = File(...),
    rag_service: RAGService = Depends(get_rag_service)
):
    try:
        content = await file.read()
        
        # Extract text
        text = processing_service.extract_text(filename, contentType, content)
        
        # Index document
        metadata = {
            "filename": filename,
            "content_type": contentType
        }
        rag_service.index_chunks(document_id=documentId, user_id=userId, text=text, metadata=metadata)
        
        return {"status": "success", "message": "Document indexed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{documentId}")
async def delete_document(
    documentId: str,
    userId: str,
    rag_service: RAGService = Depends(get_rag_service)
):
    try:
        rag_service.delete_document(user_id=userId, document_id=documentId)
        return {"status": "success", "message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve", response_model=RetrievalResponse)
async def retrieve_documents(
    request: RetrievalRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    try:
        chunks = rag_service.search_similar(
            query=request.query,
            user_id=request.userId,
            top_k=request.topK
        )
        
        results = []
        for chunk in chunks:
            results.append(RetrievedChunkModel(
                documentId=chunk.document_id,
                chunkId=chunk.chunk_id,
                filename=chunk.metadata.get("filename", "unknown"),
                content=chunk.content,
                score=chunk.score
            ))
            
        return RetrievalResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/answer", response_model=RagAnswerResponse)
async def answer_question(
    request: RagAnswerRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    try:
        response = rag_service.retrieve_and_answer(
            query=request.query,
            user_id=request.userId,
            top_k=request.topK
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

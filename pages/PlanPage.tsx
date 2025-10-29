
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { TaskWorkEntry, WorkEntryType } from '../types';
import Modal from '../components/Modal';
import { getPdf } from '../utils/db';

// Define pdfjsLib type for TypeScript
declare const pdfjsLib: any;

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const PlanPage: React.FC = () => {
  const { 
    projects, workers, workEntries, activeProjectId, setActiveProjectId, 
    addWorkEntry, setLoading, loading,
    smallTableRate, mediumTableRate, largeTableRate
  } = useAppContext();
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfPageRef = useRef<any>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfNotFound, setPdfNotFound] = useState(false);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const pinchStartDist = useRef(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tapCoordinates, setTapCoordinates] = useState<{ x: number, y: number } | null>(null);
  
  const [taskType, setTaskType] = useState('custom');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');

  const projectWorkEntries = workEntries.filter(e => e.projectId === activeProjectId && e.type === WorkEntryType.Task);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pdfPageRef.current) {
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);

      ctx.drawImage(pdfPageRef.current, 0, 0);

      projectWorkEntries.forEach(entry => {
        if(entry.type === WorkEntryType.Task){
          ctx.beginPath();
          ctx.arc(entry.x, entry.y, 8 / transform.scale, 0, 2 * Math.PI, false);
          ctx.fillStyle = 'rgba(0, 191, 255, 0.7)'; // brand-electric
          ctx.fill();
          ctx.lineWidth = 2 / transform.scale;
          ctx.strokeStyle = 'rgba(224, 225, 221, 0.9)'; // brand-ghost
          ctx.stroke();
        }
      });
    }

    ctx.restore();
  }, [transform, projectWorkEntries]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
            draw();
        }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);


  useEffect(() => {
    if (activeProjectId) {
      setLoading(true);
      setPdfUrl(null);
      setPdfNotFound(false);
      pdfPageRef.current = null;
      getPdf(activeProjectId)
        .then(url => {
          if (url) {
            setPdfUrl(url);
          } else {
            setPdfNotFound(true);
            setLoading(false);
          }
        })
        .catch(error => {
          console.error("Failed to get PDF from DB", error);
          setPdfUrl(null);
          setPdfNotFound(true);
          setLoading(false);
        });
    } else {
      setPdfUrl(null);
      pdfPageRef.current = null;
      setPdfNotFound(false);
    }
  }, [activeProjectId, setLoading]);
  
  useEffect(() => {
    const loadPdf = async () => {
      if (!pdfUrl) {
        draw(); // Clear canvas if no pdfUrl
        return;
      }
      
      try {
        const base64Data = pdfUrl.split(',')[1];
        const pdfData = atob(base64Data);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1);
        
        const originalViewport = page.getViewport({ scale: 1.0 });
        const MAX_DIMENSION = 4096;
        const scale = Math.min(MAX_DIMENSION / originalViewport.width, MAX_DIMENSION / originalViewport.height, 2.0);
        const viewport = page.getViewport({ scale });

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        if(offscreenCtx) {
          await page.render({ canvasContext: offscreenCtx, viewport }).promise;
          pdfPageRef.current = offscreenCanvas;
          draw();
        }
      } catch (error) {
        console.error("Failed to load PDF", error);
        pdfPageRef.current = null;
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [pdfUrl, setLoading, draw]);
  
  useEffect(() => {
    draw();
  }, [draw]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleCanvasTap = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const point = getPoint(e);
      const x = (point.x - rect.left - transform.offsetX) / transform.scale;
      const y = (point.y - rect.top - transform.offsetY) / transform.scale;

      if(pdfPageRef.current && x > 0 && y > 0 && x < pdfPageRef.current.width && y < pdfPageRef.current.height) {
          setTapCoordinates({ x, y });
          setTaskType('custom');
          setDescription('');
          setReward('');
          setIsModalOpen(true);
      }
  };

  // Mouse Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const point = { x: e.clientX, y: e.clientY };
    setLastPanPoint(point);
    setDragStartPoint(point);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !lastPanPoint) return;
    const dx = e.clientX - lastPanPoint.x;
    const dy = e.clientY - lastPanPoint.y;
    setTransform(prev => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if(isDragging && dragStartPoint) {
      const dist = Math.sqrt(Math.pow(e.clientX - dragStartPoint.x, 2) + Math.pow(e.clientY - dragStartPoint.y, 2));
       if (dist < 5) {
          handleCanvasTap(e);
       }
    }
    setIsDragging(false);
    setLastPanPoint(null);
    setDragStartPoint(null);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    if (e.ctrlKey) {
        // Zooming with Ctrl + Scroll
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.2, transform.scale * (1 + scaleAmount)), 5);
        
        const worldX = (mouseX - transform.offsetX) / transform.scale;
        const worldY = (mouseY - transform.offsetY) / transform.scale;
        const newOffsetX = mouseX - worldX * newScale;
        const newOffsetY = mouseY - worldY * newScale;
        
        setTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
    } else {
        // Panning with scroll wheel
        const dx = -e.deltaX;
        const dy = -e.deltaY;
        setTransform(prev => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
    }
  };

  // Touch Controls
  const getTouchDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchMidpoint = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        setIsPinching(true);
        setIsDragging(false);
        pinchStartDist.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
        e.preventDefault();
        setIsDragging(true);
        setIsPinching(false);
        const point = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setLastPanPoint(point);
        setDragStartPoint(point);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isPinching && e.touches.length === 2) {
        const newDist = getTouchDistance(e.touches);
        const scaleFactor = newDist / pinchStartDist.current;
        pinchStartDist.current = newDist;

        const newScale = Math.min(Math.max(0.2, transform.scale * scaleFactor), 5);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const midpoint = getTouchMidpoint(e.touches);
        const pinchX = midpoint.x - rect.left;
        const pinchY = midpoint.y - rect.top;
        
        const worldX = (pinchX - transform.offsetX) / transform.scale;
        const worldY = (pinchY - transform.offsetY) / transform.scale;

        const newOffsetX = pinchX - worldX * newScale;
        const newOffsetY = pinchY - worldY * newScale;

        setTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
    } else if (isDragging && e.touches.length === 1 && lastPanPoint) {
        const dx = e.touches[0].clientX - lastPanPoint.x;
        const dy = e.touches[0].clientY - lastPanPoint.y;
        setTransform(prev => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
        setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDragging && dragStartPoint && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const dist = Math.sqrt(Math.pow(touch.clientX - dragStartPoint.x, 2) + Math.pow(touch.clientY - dragStartPoint.y, 2));
        if (dist < 10) {
            handleCanvasTap(e);
        }
    }

    if (e.touches.length < 2) setIsPinching(false);
    if (e.touches.length < 1) {
        setIsDragging(false);
        setLastPanPoint(null);
        setDragStartPoint(null);
    }
  };

  const handleModalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tapCoordinates || !activeProjectId) return;

    const formData = new FormData(e.currentTarget);
    const workerId = formData.get('workerId') as string;
    
    const rewardValue = parseFloat(reward);
    
    if (workerId && description && !isNaN(rewardValue) && rewardValue > 0) {
      const newEntry: Omit<TaskWorkEntry, 'id' | 'date'> = {
        projectId: activeProjectId,
        workerId,
        description,
        reward: rewardValue,
        x: tapCoordinates.x,
        y: tapCoordinates.y,
        type: WorkEntryType.Task
      };
      addWorkEntry(newEntry);
      setIsModalOpen(false);
      setTapCoordinates(null);
    }
  };
  
  const handleTaskTypeChange = (newType: string) => {
    setTaskType(newType);
    if (newType === 'small') {
      setDescription(t('plan_task_type_small'));
      setReward(smallTableRate.toString());
    } else if (newType === 'medium') {
      setDescription(t('plan_task_type_medium'));
      setReward(mediumTableRate.toString());
    } else if (newType === 'large') {
      setDescription(t('plan_task_type_large'));
      setReward(largeTableRate.toString());
    }
  };

  const formInputStyle = "w-full bg-brand-gunmetal/80 text-brand-ghost p-3 rounded-lg border border-brand-shale focus:outline-none focus:ring-2 focus:ring-brand-electric focus:border-brand-electric transition";
  const formLabelStyle = "block mb-2 text-sm font-medium text-brand-silver";

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4">
        <select
          value={activeProjectId || ''}
          onChange={(e) => setActiveProjectId(e.target.value || null)}
          className={`${formInputStyle} ${activeProjectId ? 'border-brand-electric' : ''}`}
        >
          <option value="">{t('plan_select_project')}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div 
        ref={containerRef}
        className="flex-grow w-full bg-brand-gunmetal touch-none overflow-hidden cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
            setIsDragging(false);
            setLastPanPoint(null);
            setDragStartPoint(null);
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {activeProjectId && !loading && pdfNotFound && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-brand-silver p-4">
            <p>{t('plan_no_pdf_found')}</p>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('plan_add_task_modal_title')}>
        <form onSubmit={handleModalSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="workerId" className={formLabelStyle}>{t('plan_worker_label')}</label>
            <select name="workerId" id="workerId" required className={formInputStyle}>
              <option value="">{t('plan_select_worker')}</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="taskType" className={formLabelStyle}>{t('plan_task_type_label')}</label>
            <select name="taskType" id="taskType" value={taskType} onChange={e => handleTaskTypeChange(e.target.value)} required className={formInputStyle}>
              <option value="custom">{t('plan_task_type_custom')}</option>
              <option value="small">{t('plan_task_type_small')}</option>
              <option value="medium">{t('plan_task_type_medium')}</option>
              <option value="large">{t('plan_task_type_large')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="description" className={formLabelStyle}>{t('plan_table_string_label')}</label>
            <input 
              type="text" name="description" id="description" required 
              className={formInputStyle} 
              placeholder={t('plan_table_string_placeholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              readOnly={taskType !== 'custom'}
            />
          </div>
          <div>
            <label htmlFor="reward" className={formLabelStyle}>{t('plan_reward_label')}</label>
            <input 
              type="number" step="0.01" name="reward" id="reward" required 
              className={formInputStyle} 
              placeholder={t('plan_reward_placeholder')}
              value={reward}
              onChange={e => setReward(e.target.value)}
              readOnly={taskType !== 'custom'}
            />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg">
            {t('plan_save_button')}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default PlanPage;

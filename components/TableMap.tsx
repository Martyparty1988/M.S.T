
import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';

interface TableMapProps {
    tables: string[];
    completedTables: Set<string>;
    selectedTables: Set<string>;
    onTableSelect: (table: string) => void;
}

const TableMap: React.FC<TableMapProps> = ({ tables, completedTables, selectedTables, onTableSelect }) => {
    const { t } = useI18n();
    const svgRef = useRef<SVGSVGElement>(null);
    const [viewBox, setViewBox] = useState({ x: -20, y: -20, width: 1000, height: 800 });
    const isPinching = useRef(false);
    const isDragging = useRef(false);
    const lastDragPoint = useRef<{ x: number, y: number } | null>(null);

    const TABLE_WIDTH = 60;
    const TABLE_HEIGHT = 90;
    const GAP = 20;
    const COLUMNS = 10; // Slightly tighter grid for mobile

    const getTableState = (table: string) => {
        if (selectedTables.has(table)) return 'selected';
        if (completedTables.has(table)) return 'completed';
        return 'pending';
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const { deltaY } = e;
        const zoomFactor = 1.1;
        const newWidth = deltaY > 0 ? viewBox.width * zoomFactor : viewBox.width / zoomFactor;
        const newHeight = deltaY > 0 ? viewBox.height * zoomFactor : viewBox.height / zoomFactor;
        
        const svg = svgRef.current;
        if (!svg) return;
        
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        
        const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
        
        const newX = transformedPoint.x - (transformedPoint.x - viewBox.x) * (newWidth / viewBox.width);
        const newY = transformedPoint.y - (transformedPoint.y - viewBox.y) * (newHeight / viewBox.height);

        setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastDragPoint.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !lastDragPoint.current) return;
        const dx = (e.clientX - lastDragPoint.current.x) * (viewBox.width / (svgRef.current?.clientWidth || 1));
        const dy = (e.clientY - lastDragPoint.current.y) * (viewBox.height / (svgRef.current?.clientHeight || 1));
        setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        lastDragPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        lastDragPoint.current = null;
    };
    
    // Touch handlers
    const lastTouches = useRef<{ t1: Touch, t2?: Touch } | null>(null);

    const getDistance = (t1: Touch, t2: Touch) => {
        return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            lastDragPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDragging.current = false;
            isPinching.current = true;
            lastTouches.current = { t1: e.touches[0], t2: e.touches[1] };
        }
    };
    
    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        const svg = svgRef.current;
        if (!svg) return;

        if (isDragging.current && e.touches.length === 1 && lastDragPoint.current) {
            const dx = (e.touches[0].clientX - lastDragPoint.current.x) * (viewBox.width / svg.clientWidth);
            const dy = (e.touches[0].clientY - lastDragPoint.current.y) * (viewBox.height / svg.clientHeight);
            setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
            lastDragPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (isPinching.current && e.touches.length === 2 && lastTouches.current?.t2) {
            const newDist = getDistance(e.touches[0], e.touches[1]);
            const oldDist = getDistance(lastTouches.current.t1, lastTouches.current.t2!);
            const zoomFactor = newDist / oldDist;

            const newWidth = viewBox.width / zoomFactor;
            const newHeight = viewBox.height / zoomFactor;

            const midPointClient = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };

            const point = svg.createSVGPoint();
            point.x = midPointClient.x;
            point.y = midPointClient.y;
            const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
            
            const newX = transformedPoint.x - (transformedPoint.x - viewBox.x) * (newWidth / viewBox.width);
            const newY = transformedPoint.y - (transformedPoint.y - viewBox.y) * (newHeight / viewBox.height);

            setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
            lastTouches.current = { t1: e.touches[0], t2: e.touches[1] };
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        isPinching.current = false;
        lastDragPoint.current = null;
        lastTouches.current = null;
    };
    
    useEffect(() => {
        if (tables.length === 0) return;
        const totalWidth = COLUMNS * (TABLE_WIDTH + GAP) - GAP;
        const totalHeight = Math.ceil(tables.length / COLUMNS) * (TABLE_HEIGHT + GAP) - GAP;
        
        // Center the content initially
        setViewBox({
            x: -20,
            y: -20,
            width: totalWidth + 40,
            height: totalHeight + 40
        });
    }, [tables, COLUMNS, TABLE_WIDTH, TABLE_HEIGHT, GAP]);

    const zoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        const factor = 1.2;
        setViewBox(prev => ({
            ...prev,
            width: prev.width / factor,
            height: prev.height / factor,
            x: prev.x + (prev.width - prev.width / factor) / 2,
            y: prev.y + (prev.height - prev.height / factor) / 2
        }));
    };

    const zoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        const factor = 1.2;
        setViewBox(prev => ({
            ...prev,
            width: prev.width * factor,
            height: prev.height * factor,
            x: prev.x - (prev.width * factor - prev.width) / 2,
            y: prev.y - (prev.height * factor - prev.height) / 2
        }));
    };

    return (
        <div className="w-full h-full bg-[#0a0a16] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing touch-none relative select-none border border-white/10 shadow-inner">
            <svg
                ref={svgRef}
                className="w-full h-full"
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <defs>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#15803d" />
                    </linearGradient>
                    <linearGradient id="gradSelected" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--accent-color-light)" />
                        <stop offset="100%" stopColor="var(--accent-color)" />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                    </linearGradient>
                    
                    {/* Solar panel grid pattern */}
                    <pattern id="solarGrid" width="20" height="30" patternUnits="userSpaceOnUse">
                        <rect width="20" height="30" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
                    </pattern>
                    
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {tables.map((table, index) => {
                    const col = index % COLUMNS;
                    const row = Math.floor(index / COLUMNS);
                    const x = col * (TABLE_WIDTH + GAP);
                    const y = row * (TABLE_HEIGHT + GAP);
                    const state = getTableState(table);

                    let fill = 'url(#gradPending)';
                    let stroke = 'rgba(255,255,255,0.2)';
                    let filter = '';
                    
                    if (state === 'completed') {
                        fill = 'url(#gradCompleted)';
                        stroke = '#4ade80';
                    } else if (state === 'selected') {
                        fill = 'url(#gradSelected)';
                        stroke = 'white';
                        filter = 'url(#glow)';
                    }

                    return (
                        <g 
                            key={table} 
                            onClick={() => onTableSelect(table)} 
                            className="cursor-pointer transition-all duration-300"
                        >
                            <title>{table} {state === 'completed' ? `(${t('map_legend_completed')})` : ''}</title>
                            {/* Main table body */}
                            <rect
                                x={x}
                                y={y}
                                width={TABLE_WIDTH}
                                height={TABLE_HEIGHT}
                                rx="4"
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={state === 'selected' ? 2 : 1}
                                filter={filter}
                            />
                            {/* Solar panel grid lines overlay */}
                            <rect
                                x={x}
                                y={y}
                                width={TABLE_WIDTH}
                                height={TABLE_HEIGHT}
                                rx="4"
                                fill="url(#solarGrid)"
                                opacity="0.3"
                                pointerEvents="none"
                            />
                            
                            {/* Table Number */}
                            <text
                                x={x + TABLE_WIDTH / 2}
                                y={y + TABLE_HEIGHT / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="white"
                                fontSize="14"
                                fontWeight="bold"
                                className="pointer-events-none drop-shadow-md"
                                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                            >
                                {table}
                            </text>

                            {/* Completed Checkmark */}
                            {state === 'completed' && (
                                <g transform={`translate(${x + TABLE_WIDTH - 18}, ${y + 2})`}>
                                    <circle cx="8" cy="8" r="8" fill="#ffffff" />
                                    <path 
                                        d="M4 8 L7 11 L12 5" 
                                        stroke="#16a34a" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        fill="none" 
                                    />
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
            
            {/* Legend */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
                <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10 shadow-lg">
                    <div className="flex items-center mb-2 last:mb-0">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className="text-xs font-medium text-white shadow-black drop-shadow-md">{t('map_legend_completed')}</span>
                    </div>
                    <div className="flex items-center mb-2 last:mb-0">
                        <div className="w-3 h-3 rounded-full bg-[var(--accent-color)] mr-2 shadow-[0_0_8px_var(--accent-color)]"></div>
                        <span className="text-xs font-medium text-white shadow-black drop-shadow-md">{t('map_legend_selected')}</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-white/20 mr-2 border border-white/30"></div>
                        <span className="text-xs font-medium text-white/70 shadow-black drop-shadow-md">{t('map_legend_pending')}</span>
                    </div>
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                 <button onClick={zoomIn} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                 </button>
                 <button onClick={zoomOut} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
                 </button>
            </div>
            
            <div className="absolute bottom-3 left-3 text-[10px] text-white/40 bg-black/40 px-2 py-1 rounded backdrop-blur-sm pointer-events-none border border-white/5">
                {t('work_view_map_zoom')}
            </div>
        </div>
    );
};

export default TableMap;

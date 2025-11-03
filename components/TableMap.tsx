

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
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
    const isPinching = useRef(false);
    const isDragging = useRef(false);
    const lastDragPoint = useRef<{ x: number, y: number } | null>(null);

    const TABLE_WIDTH = 60;
    const TABLE_HEIGHT = 90;
    const GAP = 20;
    const COLUMNS = 12;

    const getTableColor = (table: string) => {
        if (selectedTables.has(table)) return 'var(--gradient-start)';
        if (completedTables.has(table)) return '#16a34a'; // green-600
        return 'rgba(255, 255, 255, 0.1)';
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
        const totalWidth = COLUMNS * (TABLE_WIDTH + GAP) - GAP;
        const totalHeight = Math.ceil(tables.length / COLUMNS) * (TABLE_HEIGHT + GAP) - GAP;
        setViewBox({
            x: -20,
            y: -20,
            width: totalWidth + 40,
            height: totalHeight + 40
        });
    }, [tables.length, COLUMNS, TABLE_WIDTH, TABLE_HEIGHT, GAP]);

    return (
        <div className="w-full h-full bg-white/5 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing touch-none relative">
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
                {tables.map((table, index) => {
                    const col = index % COLUMNS;
                    const row = Math.floor(index / COLUMNS);
                    const x = col * (TABLE_WIDTH + GAP);
                    const y = row * (TABLE_HEIGHT + GAP);

                    return (
                        <g key={table} onClick={() => onTableSelect(table)} className="cursor-pointer">
                            <rect
                                x={x}
                                y={y}
                                width={TABLE_WIDTH}
                                height={TABLE_HEIGHT}
                                rx="8"
                                fill={getTableColor(table)}
                                stroke="rgba(255, 255, 255, 0.3)"
                                strokeWidth="1"
                            />
                            <text
                                x={x + TABLE_WIDTH / 2}
                                y={y + TABLE_HEIGHT / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="white"
                                fontSize="16"
                                fontWeight="bold"
                                className="pointer-events-none"
                            >
                                {table}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="absolute bottom-2 right-2 text-xs text-white/50 bg-black/30 px-2 py-1 rounded">
                {t('work_view_map_zoom')}
            </div>
        </div>
    );
};

export default TableMap;
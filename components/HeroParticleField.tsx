import React, { useEffect, useRef } from 'react';
import {
    BufferGeometry,
    CanvasTexture,
    Color,
    Float32BufferAttribute,
    Group,
    PerspectiveCamera,
    Points,
    PointsMaterial,
    Scene,
    Vector2,
    WebGLRenderer,
} from 'three';

type ParticleState = {
    x: number;
    y: number;
    z: number;
    speed: number;
    phase: number;
};

const COLORS = ['#4169E1', '#4169E1', '#111111', '#8ea2f5'];

const createDotTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(24, 24, 20, 0, Math.PI * 2);
    context.fill();

    return new CanvasTexture(canvas);
};

export const HeroParticleField: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scene = new Scene();
        const camera = new PerspectiveCamera(42, 1, 1, 1200);
        camera.position.set(0, 0, 520);

        const renderer = new WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
        });
        renderer.setClearColor(0xffffff, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.domElement.className = 'absolute inset-0 h-full w-full';
        container.appendChild(renderer.domElement);

        const group = new Group();
        scene.add(group);

        const particleCount = window.innerWidth < 768 ? 58 : 180;
        const geometry = new BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const dotTexture = createDotTexture();
        const material = new PointsMaterial({
            size: window.innerWidth < 768 ? 4.2 : 5.4,
            sizeAttenuation: true,
            map: dotTexture || undefined,
            alphaTest: 0.5,
            transparent: true,
            opacity: 0.76,
            vertexColors: true,
            depthWrite: false,
        });

        const particles: ParticleState[] = [];
        const palette = COLORS.map((color) => new Color(color));

        for (let i = 0; i < particleCount; i += 1) {
            particles.push({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: 30 + Math.random() * 260,
                speed: 0.16 + Math.random() * 0.48,
                phase: Math.random() * Math.PI * 2,
            });

            const color = palette[i % palette.length].clone();
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

        const points = new Points(geometry, material);
        group.add(points);

        const pointer = new Vector2(0, 0);
        const targetPointer = new Vector2(0, 0);
        const onPointerMove = (event: PointerEvent) => {
            const rect = container.getBoundingClientRect();
            targetPointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
            targetPointer.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
        };

        const resize = () => {
            const width = container.clientWidth || 1;
            const height = container.clientHeight || 1;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
        };

        window.addEventListener('pointermove', onPointerMove);
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        let frameId = 0;
        let start = performance.now();

        const render = (now: number) => {
            const elapsed = (now - start) * 0.001;
            pointer.lerp(targetPointer, prefersReducedMotion ? 0.018 : 0.032);

            group.rotation.y = elapsed * 0.055 + pointer.x * 0.24;
            group.rotation.x = -pointer.y * 0.12;
            group.rotation.z = pointer.x * 0.045;
            camera.position.x = pointer.x * 32;
            camera.position.y = -pointer.y * 20;
            camera.lookAt(0, 42, 0);

            const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
            const visibleWidth = visibleHeight * camera.aspect;
            const spreadX = visibleWidth * 0.58;
            const spreadY = visibleHeight * 0.54;
            const positionAttribute = geometry.getAttribute('position') as Float32BufferAttribute;

            particles.forEach((particle, index) => {
                const drift = Math.sin(elapsed * particle.speed + particle.phase) * 12;
                const orbit = Math.cos(elapsed * particle.speed * 0.65 + particle.phase) * 9;
                positionAttribute.setXYZ(
                    index,
                    particle.x * spreadX + orbit + pointer.x * (20 + particle.z * 0.04),
                    particle.y * spreadY + drift - pointer.y * 14,
                    particle.z
                );
            });
            positionAttribute.needsUpdate = true;

            renderer.render(scene, camera);
            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame((time) => {
            start = time;
            render(time);
        });

        return () => {
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            window.removeEventListener('pointermove', onPointerMove);
            geometry.dispose();
            material.dispose();
            dotTexture?.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
            aria-hidden="true"
        />
    );
};

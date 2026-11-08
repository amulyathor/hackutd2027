"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CBREFacilityNode,
  InvisibleDependencyEdge,
  RackNode,
  StabilityClusterType,
} from "@/lib/datacenter-twin";
import {
  Activity,
  AlertTriangle,
  Compass,
  Eye,
  Flame,
  Layers,
  Wrench,
  ZoomIn,
} from "lucide-react";

interface DataHall3DCanvasProps {
  racks: RackNode[];
  facilityNodes: CBREFacilityNode[];
  dependencyEdges: InvisibleDependencyEdge[];
  selectedRackId: string;
  onSelectRack: (rackId: string) => void;
  visualMode: "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP";
  showInvisibleNetwork: boolean;
  nemotronMitigated: boolean;
}

// Strict 3-color semantic palette: Green (Healthy), Amber (Transient Drift), Red (Hardware Swap / Breach)
function getClusterColorHex(
  rack: RackNode,
  mode: "CLUSTER_STABILITY" | "REPLACEMENT_XRAY" | "THERMAL_HEATMAP"
): number {
  if (mode === "REPLACEMENT_XRAY") {
    if (rack.replacementRecommended) return 0xef4444; // Red: Intrinsic hardware swap required
    if (rack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT") return 0xf59e0b; // Amber: Transient drift
    return 0x1e293b; // Neutral Slate: Dimmed healthy rack
  }

  if (mode === "THERMAL_HEATMAP") {
    if (rack.coolantTempC >= 42 || rack.replacementRecommended) return 0xef4444; // Red
    if (rack.coolantTempC >= 34) return 0xf59e0b; // Amber
    return 0x10b981; // Green
  }

  const map: Record<StabilityClusterType, number> = {
    HEALTHY_OPTIMAL: 0x10b981, // Green
    TRANSIENT_THERMAL_DRIFT: 0xf59e0b, // Amber
    HARDWARE_SWAP_REQUIRED: 0xef4444, // Red
  };
  return map[rack.stabilityCluster] || 0x10b981;
}

export default function DataHall3DCanvas({
  racks,
  facilityNodes,
  selectedRackId,
  onSelectRack,
  visualMode,
  showInvisibleNetwork,
  nemotronMitigated,
}: DataHall3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredRack, setHoveredRack] = useState<RackNode | null>(null);
  const [activeClusterFocus, setActiveClusterFocus] = useState<string>("ALL");

  const racksRef = useRef<RackNode[]>(racks);
  racksRef.current = racks;
  const selectedIdRef = useRef<string>(selectedRackId);
  selectedIdRef.current = selectedRackId;
  const modeRef = useRef(visualMode);
  modeRef.current = visualMode;
  const showNetworkRef = useRef(showInvisibleNetwork);
  showNetworkRef.current = showInvisibleNetwork;

  const sphericalRef = useRef({
    radius: 23,
    theta: 0.62,
    phi: 0.98,
    target: new THREE.Vector3(0, 0.8, 0),
  });

  const focusCluster = (clusterId: string) => {
    setActiveClusterFocus(clusterId);
    if (clusterId === "ALL") {
      sphericalRef.current = {
        radius: 24,
        theta: 0.62,
        phi: 0.98,
        target: new THREE.Vector3(0, 0.8, 0),
      };
    } else if (clusterId === "CLUSTER-A") {
      sphericalRef.current = {
        radius: 14,
        theta: 0.75,
        phi: 0.95,
        target: new THREE.Vector3(-4.8, 1.0, -3.6),
      };
    } else if (clusterId === "CLUSTER-B") {
      sphericalRef.current = {
        radius: 14,
        theta: -0.55,
        phi: 0.92,
        target: new THREE.Vector3(4.8, 1.0, -3.6),
      };
    } else if (clusterId === "CLUSTER-C") {
      sphericalRef.current = {
        radius: 14,
        theta: 0.45,
        phi: 0.92,
        target: new THREE.Vector3(-4.8, 1.0, 3.6),
      };
    } else if (clusterId === "CLUSTER-D") {
      sphericalRef.current = {
        radius: 14,
        theta: -0.45,
        phi: 0.92,
        target: new THREE.Vector3(4.8, 1.0, 3.6),
      };
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 530;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.016);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xdce7f5, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(15, 24, 14);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 0.7);
    dirLight2.position.set(-16, 18, -12);
    scene.add(dirLight2);

    // Sleek Data Center Floor Grid
    const gridHelper = new THREE.GridHelper(36, 36, 0x1e3a8a, 0x0f172a);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(36, 26);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070c18,
      roughness: 0.85,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.05;
    scene.add(floorMesh);

    // Glowing Floor Pods for Clusters A, B, C, D
    const clusterPads = [
      { id: "CLUSTER-A", label: "Cluster Alpha · Frontier LLM", x: -4.8, z: -3.6, color: 0x10b981 },
      { id: "CLUSTER-B", label: "Cluster Bravo · Inference Mesh", x: 4.8, z: -3.6, color: 0xf59e0b },
      { id: "CLUSTER-C", label: "Cluster Charlie · Quant Pod", x: -4.8, z: 3.6, color: 0xef4444 },
      { id: "CLUSTER-D", label: "Cluster Delta · Simulation", x: 4.8, z: 3.6, color: 0x38bdf8 },
    ];
    clusterPads.forEach((pad) => {
      const padGeo = new THREE.PlaneGeometry(9.6, 6.4);
      const padMat = new THREE.MeshBasicMaterial({
        color: pad.color,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.rotation.x = -Math.PI / 2;
      padMesh.position.set(pad.x, 0.01, pad.z);
      scene.add(padMesh);

      const borderGeo = new THREE.EdgesGeometry(padGeo);
      const borderMat = new THREE.LineBasicMaterial({
        color: pad.color,
        transparent: true,
        opacity: 0.45,
      });
      const borderLine = new THREE.LineSegments(borderGeo, borderMat);
      borderLine.rotation.x = -Math.PI / 2;
      borderLine.position.set(pad.x, 0.02, pad.z);
      scene.add(borderLine);
    });

    const rackGroupsMap = new Map<
      string,
      {
        group: THREE.Group;
        frameMat: THREE.MeshStandardMaterial;
        topBeaconMat: THREE.MeshBasicMaterial;
        selectionRingMat: THREE.MeshBasicMaterial;
        bladeMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[];
        hitBox: THREE.Mesh;
      }
    >();

    const interactableMeshes: THREE.Object3D[] = [];

    racksRef.current.forEach((rack) => {
      const group = new THREE.Group();
      group.position.set(rack.position3D[0], 0, rack.position3D[2]);

      const cabinetGeo = new THREE.BoxGeometry(1.35, 2.75, 1.55);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.75,
        roughness: 0.35,
        emissive: 0x000000,
        emissiveIntensity: 0.2,
      });
      const cabinetMesh = new THREE.Mesh(cabinetGeo, frameMat);
      cabinetMesh.position.y = 1.375;
      group.add(cabinetMesh);

      const edgesGeo = new THREE.EdgesGeometry(cabinetGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.7,
      });
      const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
      edgesLine.position.y = 1.375;
      group.add(edgesLine);

      const bladeMeshes: {
        mesh: THREE.Mesh;
        mat: THREE.MeshStandardMaterial;
      }[] = [];
      for (let b = 0; b < 8; b++) {
        const bladeGeo = new THREE.BoxGeometry(1.18, 0.22, 1.42);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.5,
          metalness: 0.45,
          roughness: 0.3,
        });
        const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
        bladeMesh.position.set(0, 0.28 + b * 0.3, 0.08);
        group.add(bladeMesh);
        bladeMeshes.push({ mesh: bladeMesh, mat: bladeMat });
      }

      const beaconGeo = new THREE.BoxGeometry(1.25, 0.12, 1.45);
      const topBeaconMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, topBeaconMat);
      beaconMesh.position.y = 2.82;
      group.add(beaconMesh);

      const ringGeo = new THREE.RingGeometry(0.95, 1.18, 32);
      const selectionRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
      });
      const ringMesh = new THREE.Mesh(ringGeo, selectionRingMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.03;
      group.add(ringMesh);

      const hitGeo = new THREE.BoxGeometry(1.5, 3.0, 1.7);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.y = 1.5;
      hitBox.userData = { rackId: rack.id };
      group.add(hitBox);
      interactableMeshes.push(hitBox);

      scene.add(group);
      rackGroupsMap.set(rack.id, {
        group,
        frameMat,
        topBeaconMat,
        selectionRingMat,
        bladeMeshes,
        hitBox,
      });
    });

    // CBRE Facility Nodes & Beams
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    facilityNodes.forEach((fNode) => {
      const nodeGeo = new THREE.OctahedronGeometry(0.68, 1);
      const nodeColor =
        fNode.category === "HVAC_COOLING"
          ? 0x06b6d4
          : fNode.category === "UTILITY_POWER"
          ? 0xa855f7
          : fNode.category === "ACCESS_CONTROL"
          ? 0xf59e0b
          : 0x10b981;
      const nodeMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.7,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(
        fNode.position3D[0],
        fNode.position3D[1],
        fNode.position3D[2]
      );
      networkGroup.add(nodeMesh);

      racksRef.current.forEach((rack) => {
        if (
          fNode.connectedRackClusters.includes(rack.clusterId) &&
          rack.stabilityCluster !== "HEALTHY_OPTIMAL"
        ) {
          const points = [
            new THREE.Vector3(
              fNode.position3D[0],
              fNode.position3D[1],
              fNode.position3D[2]
            ),
            new THREE.Vector3(
              (fNode.position3D[0] + rack.position3D[0]) * 0.5,
              3.8,
              (fNode.position3D[2] + rack.position3D[2]) * 0.5
            ),
            new THREE.Vector3(rack.position3D[0], 2.85, rack.position3D[2]),
          ];
          const curve = new THREE.QuadraticBezierCurve3(
            points[0],
            points[1],
            points[2]
          );
          const lineGeo = new THREE.BufferGeometry().setFromPoints(
            curve.getPoints(24)
          );
          const lineMat = new THREE.LineBasicMaterial({
            color: rack.replacementRecommended ? 0xef4444 : nodeColor,
            transparent: true,
            opacity: 0.45,
          });
          const curveLine = new THREE.Line(lineGeo, lineMat);
          networkGroup.add(curveLine);
        }
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let prevPointerPos = { x: 0, y: 0 };

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      prevPointerPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - prevPointerPos.x;
        const dy = e.clientY - prevPointerPos.y;
        prevPointerPos = { x: e.clientX, y: e.clientY };

        sphericalRef.current.theta -= dx * 0.0065;
        sphericalRef.current.phi = Math.max(
          0.18,
          Math.min(Math.PI / 2 - 0.08, sphericalRef.current.phi - dy * 0.0065)
        );
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(interactableMeshes, false);
      if (intersects.length > 0) {
        const hitRackId = intersects[0].object.userData?.rackId;
        const found = racksRef.current.find((r) => r.id === hitRackId) || null;
        setHoveredRack(found);
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoveredRack(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moveDist < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(interactableMeshes, false);
        if (intersects.length > 0) {
          const hitRackId = intersects[0].object.userData?.rackId;
          if (hitRackId) onSelectRack(hitRackId);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(
        9,
        Math.min(36, sphericalRef.current.radius + e.deltaY * 0.015)
      );
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    domElem.addEventListener("wheel", handleWheel, { passive: false });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 530;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let animFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      const { radius, theta, phi, target } = sphericalRef.current;
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);

      networkGroup.visible = showNetworkRef.current;

      const currentMode = modeRef.current;
      const currentSelected = selectedIdRef.current;

      racksRef.current.forEach((rack) => {
        const item = rackGroupsMap.get(rack.id);
        if (!item) return;

        const baseHex = getClusterColorHex(rack, currentMode);
        const isSelected = rack.id === currentSelected;
        const isSwapRequired = rack.replacementRecommended;

        const pulse = isSwapRequired
          ? 0.55 + 0.45 * Math.sin(elapsed * 5.0)
          : 0.65;

        item.topBeaconMat.color.setHex(baseHex);
        item.frameMat.emissive.setHex(baseHex);
        item.frameMat.emissiveIntensity = isSelected
          ? 0.45
          : isSwapRequired
          ? pulse * 0.32
          : 0.1;

        item.selectionRingMat.opacity = isSelected ? 0.95 : 0.0;

        rack.blades.forEach((blade, bIdx) => {
          const bladeObj = item.bladeMeshes[bIdx];
          if (!bladeObj) return;

          if (currentMode === "REPLACEMENT_XRAY") {
            if (blade.needsReplacement) {
              bladeObj.mat.color.setHex(0xef4444);
              bladeObj.mat.emissive.setHex(0xef4444);
              bladeObj.mat.emissiveIntensity =
                0.85 + 0.3 * Math.sin(elapsed * 5.5);
              bladeObj.mesh.position.z = 0.42 + 0.05 * Math.sin(elapsed * 4);
            } else {
              bladeObj.mat.color.setHex(0x1e293b);
              bladeObj.mat.emissive.setHex(0x0f172a);
              bladeObj.mat.emissiveIntensity = 0.12;
              bladeObj.mesh.position.z = 0.08;
            }
          } else {
            const bladeHex = blade.needsReplacement ? 0xef4444 : baseHex;
            bladeObj.mat.color.setHex(bladeHex);
            bladeObj.mat.emissive.setHex(bladeHex);
            bladeObj.mat.emissiveIntensity = blade.needsReplacement
              ? 0.85
              : 0.42;
            bladeObj.mesh.position.z = blade.needsReplacement ? 0.22 : 0.08;
          }
        });
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      domElem.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      domElem.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [facilityNodes, onSelectRack]);

  return (
    <div className="relative w-full h-[530px] rounded-3xl overflow-hidden border border-slate-700/60 bg-[#060913] shadow-2xl">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Floating Bar: Cluster Zoom Pills */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Cluster Navigation Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
            <Compass className="w-3 h-3 text-sky-400" /> Focus Cluster:
          </span>
          <button
            onClick={() => focusCluster("ALL")}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
              activeClusterFocus === "ALL"
                ? "bg-slate-800 text-white border border-slate-600"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All (32 Racks)
          </button>
          <button
            onClick={() => focusCluster("CLUSTER-B")}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeClusterFocus === "CLUSTER-B"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                : "text-slate-400 hover:text-amber-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Cluster Bravo (Inference · Overheating)
          </button>
          <button
            onClick={() => focusCluster("CLUSTER-C")}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeClusterFocus === "CLUSTER-C"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                : "text-slate-400 hover:text-rose-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Cluster Charlie (Quant · 91mV Ripple)
          </button>
          <button
            onClick={() => focusCluster("CLUSTER-A")}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
              activeClusterFocus === "CLUSTER-A"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Cluster Alpha (LLM)
          </button>
        </div>

        {/* Right: Autonomous Status Pill */}
        {nemotronMitigated && (
          <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 text-emerald-300 px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Aux Cooling Open · Workloads Live-Migrated
          </div>
        )}
      </div>

      {/* Bottom Floating Bar: Interactive Controls & Click Hint */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Camera Controls */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-1.5 text-xs text-slate-300 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Cooling Drift
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Hardware Swap Required
            </span>
          </div>
        </div>

        {/* Center / Right: Click Hint */}
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-2xl px-3.5 py-1.5 text-xs text-slate-300 shadow-xl flex items-center gap-2">
          <span className="text-sky-400 font-bold">💡 Tip:</span> Click any server rack in 3D to inspect internal GPU trays
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredRack && (
        <div className="absolute top-16 right-4 w-72 bg-slate-950/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-3.5 text-xs text-slate-200 shadow-2xl pointer-events-none animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div>
              <span className="font-bold text-white text-sm">{hoveredRack.label}</span>
              <span className="text-[10px] text-slate-400 block">{hoveredRack.gpuArchitecture}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                hoveredRack.replacementRecommended
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : hoveredRack.stabilityCluster === "TRANSIENT_THERMAL_DRIFT"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {hoveredRack.healthScore}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mb-2">
            <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Coolant Temp</span>
              <strong className="text-white text-xs">{hoveredRack.coolantTempC}°C</strong>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Flow Rate</span>
              <strong className="text-white text-xs">{hoveredRack.coolantFlowLpm} L/m</strong>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">PSU Ripple</span>
              <strong className="text-white text-xs">{hoveredRack.voltageRippleMv} mV</strong>
            </div>
            <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">ECC Error Rate</span>
              <strong className="text-white text-xs">{hoveredRack.totalEccErrorsPerHr} ECC/h</strong>
            </div>
          </div>

          {hoveredRack.replacementRecommended && (
            <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-2 text-[11px] text-rose-200">
              <strong className="text-rose-400 block mb-0.5">⚠️ Cage 4 Swap Required:</strong>
              {hoveredRack.replacementDiagnosis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

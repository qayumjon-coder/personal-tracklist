import { useEffect, useState } from "react";

export function SystemCrash() {
  const [phase, setPhase] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);

  const [corruption, setCorruption] = useState<string>("");

  // Phase 0: VRAM Memory Corruption (The Glitch)
  useEffect(() => {
    if (phase === 0) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=<>?[]{}|;:,.~`▒▓█▄▀■";
      const generateGarbage = () => Array.from({ length: 2000 }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      
      setCorruption(generateGarbage());
      const interval = setInterval(() => {
        setCorruption(generateGarbage());
      }, 100);

      const timer = setTimeout(() => {
        clearInterval(interval);
        setPhase(1);
      }, 1000); // 1 second of corruption before reboot

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [phase]);

  // Phase 1: BIOS
  useEffect(() => {
    if (phase === 1) {
      setLogs([
        "Award Modular BIOS v6.00PG, An Energy Star Ally",
        "Copyright (C) 1984-2026, Award Software, Inc.",
        "",
        "FRONTO-NODE-001 MAINBOARD REV 1.4",
        "",
        "Main Processor : Intel(R) Xeon(R) CPU E5-2699 v4 @ 2.20GHz",
        "Memory Testing : 131072K OK",
        "",
        "Detecting IDE Primary Master ... [Press F4 to skip]",
        "Detecting IDE Primary Slave  ... None",
        "Detecting IDE Secondary Master ... None",
        "Detecting IDE Secondary Slave  ... None",
      ]);
      const timer = setTimeout(() => setPhase(2), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Phase 2: Kernel Boot & Panic
  useEffect(() => {
    if (phase === 2) {
      setLogs([]);
      let lineCount = 0;
      
      const generateLogLine = () => {
        const components = ["vfs", "ext4", "systemd", "nvme0n1", "kernel", "acpi", "pci", "usb"];
        const comp = components[Math.floor(Math.random() * components.length)];
        const time = (Math.random() * 10).toFixed(6);
        const hex = `0x${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}`;
        
        if (lineCount > 150) {
           return `[   ${time}] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)`;
        }
        if (lineCount > 140) {
           return `[   ${time}] Call Trace: [${hex}] ? dump_stack_lvl+0x48/0x70`;
        }
        if (lineCount > 130) {
           return `[   ${time}] EXT4-fs error (device nvme0n1p2): ext4_lookup: deleted inode referenced`;
        }
        
        return `[   ${time}] ${comp}: Initializing core system ${hex} ... [OK]`;
      };

      const interval = setInterval(() => {
        setLogs(prev => {
          const newLogs = [...prev, generateLogLine()];
          // keep only last 40 lines to avoid DOM lag
          if (newLogs.length > 40) newLogs.shift();
          return newLogs;
        });
        lineCount++;

        if (lineCount > 155) {
          clearInterval(interval);
          setPhase(3);
        }
      }, 20); // insanely fast scrolling

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Phase 3: Dump Memory
  useEffect(() => {
    if (phase === 3) {
      let count = 0;
      const interval = setInterval(() => {
        setLogs(prev => {
          let dumpLine = "";
          for(let i=0; i<8; i++) {
             dumpLine += Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') + " ";
          }
          const newLogs = [...prev, `Dumping physical memory: ${dumpLine}`];
          if (newLogs.length > 40) newLogs.shift();
          return newLogs;
        });
        count++;
        if (count > 50) {
          clearInterval(interval);
          setPhase(4);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase]);

  if (phase === 0) {
    return (
      <div className="w-full h-screen bg-black overflow-hidden font-mono text-[10px] sm:text-xs">
        <div className="text-red-500 opacity-80 break-all leading-none w-[110%] -ml-[5%] whitespace-pre-wrap mix-blend-screen" style={{ textShadow: '2px 0 4px red' }}>
           {corruption}
        </div>
        <div className="absolute top-1/2 left-0 w-full h-[10vh] bg-green-500 opacity-20 mix-blend-overlay animate-pulse"></div>
        <div className="absolute top-1/4 left-0 w-full h-[5vh] bg-blue-500 opacity-30 mix-blend-overlay"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black text-[#a8a8a8] font-mono text-xs sm:text-sm p-4 overflow-hidden selection:bg-white selection:text-black">
      {/* Scanline effect over the crash terminal */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-10" style={{ background: 'repeating-linear-gradient(0deg, #fff 0px, transparent 1px) 0 0 / 100% 3px' }}></div>
      
      <div className="max-w-5xl relative z-10">
        {logs.map((log, i) => {
          let colorClass = "";
          if (log.includes("Kernel panic") || log.includes("EXT4-fs error")) colorClass = "text-red-500 font-bold animate-pulse";
          else if (log.includes("Call Trace")) colorClass = "text-yellow-500";
          else if (log.includes("Dumping")) colorClass = "text-blue-400 opacity-80";
          
          return (
            <div key={i} className={`whitespace-pre-wrap leading-tight mb-1 ${colorClass}`}>
              {log}
            </div>
          );
        })}
        {phase === 4 && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-red-500 font-bold">---[ end Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0) ]---</div>
            <div className="text-white mt-4 flex items-center gap-2">
               System halted. Please power off machine manually.
               <div className="animate-pulse w-2 h-4 bg-[#a8a8a8]"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

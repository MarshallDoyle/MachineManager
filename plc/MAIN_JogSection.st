// ============================================================================
// MAIN_JogSection.st
// Reference Structured Text to add to MAIN.TcPOU for Machine Manager integration.
//
// INSTRUCTIONS:
//   1. Add the VAR declarations below to MAIN's VAR block
//   2. Add the code section at the END of MAIN's implementation (after state machine)
//   3. This code runs every PLC cycle regardless of state machine position
// ============================================================================

// ===== ADD TO MAIN VAR BLOCK =====
// (paste these into MAIN's variable declarations)

(*
VAR
    // Machine Manager jog function blocks
    fbJogX      : FB_JogAxis;
    fbJogY      : FB_JogAxis;     // Drives Y_Master; Y_Slave follows via MC_GearIn
    fbJogZ      : FB_JogAxis;
    fbJogZ2     : FB_JogAxis;
    fbJogExt    : FB_JogAxis;

    // ADS watchdog
    nAdsHeartbeatLast : UDINT;
    tAdsWatchdog      : TON;
    bAdsTimeout       : BOOL;
END_VAR
*)


// ===== ADD TO END OF MAIN IMPLEMENTATION =====
// (paste after the CASE state machine, before END of program body)

// ----------------------------------------------------------------------------
// 1. READ COMMANDS FROM GVL (App -> PLC)
// ----------------------------------------------------------------------------
// System commands - map GVL to MAIN's existing local booleans
bEnableSystem     := GVL_MachineManager.bEnableSystem;
bHomeSystem       := GVL_MachineManager.bHomeSystem;
bResetError       := GVL_MachineManager.bResetError;
bLoadFile         := GVL_MachineManager.bLoadFile;
bRunFile          := GVL_MachineManager.bRunFile;
bStopFile         := GVL_MachineManager.bStopFile;
bResetInterpreter := GVL_MachineManager.bResetInterpreter;
nFeedOverride     := GVL_MachineManager.nFeedOverride;
sGCodeFileName    := GVL_MachineManager.sGCodeFileName;

// Tool measurement trigger
// (You may need to add a state transition trigger for bStartToolMeasure
//  depending on how your state machine handles re-measurement)

// ----------------------------------------------------------------------------
// 2. ADS WATCHDOG - auto-stop jog if heartbeat stale
// ----------------------------------------------------------------------------
tAdsWatchdog(IN := (GVL_MachineManager.nAdsHeartbeat = nAdsHeartbeatLast), PT := T#500MS);
bAdsTimeout := tAdsWatchdog.Q;
nAdsHeartbeatLast := GVL_MachineManager.nAdsHeartbeat;

IF bAdsTimeout THEN
    // Clear all jog commands to prevent runaway motion
    GVL_MachineManager.bXJogForward  := FALSE;
    GVL_MachineManager.bXJogBackward := FALSE;
    GVL_MachineManager.bYJogForward  := FALSE;
    GVL_MachineManager.bYJogBackward := FALSE;
    GVL_MachineManager.bZJogForward  := FALSE;
    GVL_MachineManager.bZJogBackward := FALSE;
    GVL_MachineManager.bZ2JogForward := FALSE;
    GVL_MachineManager.bZ2JogBackward:= FALSE;
    GVL_MachineManager.bExtJogForward := FALSE;
    GVL_MachineManager.bExtJogBackward:= FALSE;
END_IF

// ----------------------------------------------------------------------------
// 3. JOG AXIS CONTROL - only when homed and not running a program
// ----------------------------------------------------------------------------
IF NOT bProgramRunning AND NOT bAdsTimeout THEN
    fbJogX(
        bJogForward  := GVL_MachineManager.bXJogForward,
        bJogBackward := GVL_MachineManager.bXJogBackward,
        fVelocity    := GVL_MachineManager.fJogVelocity,
        nJogMode     := GVL_MachineManager.nJogMode,
        fJogDistance  := GVL_MachineManager.fJogDistance,
        bStop        := GVL_MachineManager.bStopAll,
        bResetError  := GVL_MachineManager.bResetError,
        Axis         := axisX
    );

    fbJogY(
        bJogForward  := GVL_MachineManager.bYJogForward,
        bJogBackward := GVL_MachineManager.bYJogBackward,
        fVelocity    := GVL_MachineManager.fJogVelocity,
        nJogMode     := GVL_MachineManager.nJogMode,
        fJogDistance  := GVL_MachineManager.fJogDistance,
        bStop        := GVL_MachineManager.bStopAll,
        bResetError  := GVL_MachineManager.bResetError,
        Axis         := axisY_Master    // Y_Slave follows via MC_GearIn coupling
    );

    fbJogZ(
        bJogForward  := GVL_MachineManager.bZJogForward,
        bJogBackward := GVL_MachineManager.bZJogBackward,
        fVelocity    := GVL_MachineManager.fJogVelocity,
        nJogMode     := GVL_MachineManager.nJogMode,
        fJogDistance  := GVL_MachineManager.fJogDistance,
        bStop        := GVL_MachineManager.bStopAll,
        bResetError  := GVL_MachineManager.bResetError,
        Axis         := axisZ
    );

    fbJogZ2(
        bJogForward  := GVL_MachineManager.bZ2JogForward,
        bJogBackward := GVL_MachineManager.bZ2JogBackward,
        fVelocity    := GVL_MachineManager.fJogVelocity,
        nJogMode     := GVL_MachineManager.nJogMode,
        fJogDistance  := GVL_MachineManager.fJogDistance,
        bStop        := GVL_MachineManager.bStopAll,
        bResetError  := GVL_MachineManager.bResetError,
        Axis         := axisZ2
    );

    fbJogExt(
        bJogForward  := GVL_MachineManager.bExtJogForward,
        bJogBackward := GVL_MachineManager.bExtJogBackward,
        fVelocity    := GVL_MachineManager.fJogVelocity,
        nJogMode     := GVL_MachineManager.nJogMode,
        fJogDistance  := GVL_MachineManager.fJogDistance,
        bStop        := GVL_MachineManager.bStopAll,
        bResetError  := GVL_MachineManager.bResetError,
        Axis         := axisExtruder
    );
END_IF

// ----------------------------------------------------------------------------
// 4. WRITE FEEDBACK TO GVL (PLC -> App)
// ----------------------------------------------------------------------------
// Axis positions (always update, even when not jogging)
GVL_MachineManager.fXActualPosition  := axisX.NcToPlc.ActPos;
GVL_MachineManager.fYActualPosition  := axisY_Master.NcToPlc.ActPos;
GVL_MachineManager.fZActualPosition  := axisZ.NcToPlc.ActPos;
GVL_MachineManager.fZ2ActualPosition := axisZ2.NcToPlc.ActPos;
GVL_MachineManager.fExtActualPosition:= axisExtruder.NcToPlc.ActPos;

// Axis velocities
GVL_MachineManager.fXActualVelocity  := axisX.NcToPlc.ActVelo;
GVL_MachineManager.fYActualVelocity  := axisY_Master.NcToPlc.ActVelo;
GVL_MachineManager.fZActualVelocity  := axisZ.NcToPlc.ActVelo;
GVL_MachineManager.fZ2ActualVelocity := axisZ2.NcToPlc.ActVelo;
GVL_MachineManager.fExtActualVelocity:= axisExtruder.NcToPlc.ActVelo;

// Axis states (from jog FBs when jogging, otherwise from NC directly)
IF NOT bProgramRunning THEN
    GVL_MachineManager.nXAxisState   := fbJogX.nAxisState;
    GVL_MachineManager.nYAxisState   := fbJogY.nAxisState;
    GVL_MachineManager.nZAxisState   := fbJogZ.nAxisState;
    GVL_MachineManager.nZ2AxisState  := fbJogZ2.nAxisState;
    GVL_MachineManager.nExtAxisState := fbJogExt.nAxisState;
    GVL_MachineManager.bXAxisError   := fbJogX.bError;
    GVL_MachineManager.bYAxisError   := fbJogY.bError;
    GVL_MachineManager.bZAxisError   := fbJogZ.bError;
    GVL_MachineManager.bZ2AxisError  := fbJogZ2.bError;
    GVL_MachineManager.bExtAxisError := fbJogExt.bError;
    GVL_MachineManager.nXAxisErrorId := fbJogX.nErrorId;
    GVL_MachineManager.nYAxisErrorId := fbJogY.nErrorId;
    GVL_MachineManager.nZAxisErrorId := fbJogZ.nErrorId;
    GVL_MachineManager.nZ2AxisErrorId:= fbJogZ2.nErrorId;
    GVL_MachineManager.nExtAxisErrorId:= fbJogExt.nErrorId;
ELSE
    // During homing/running, read state directly from NC
    GVL_MachineManager.nXAxisState   := UDINT_TO_UINT(axisX.NcToPlc.StateDWord AND 16#FF);
    GVL_MachineManager.nYAxisState   := UDINT_TO_UINT(axisY_Master.NcToPlc.StateDWord AND 16#FF);
    GVL_MachineManager.nZAxisState   := UDINT_TO_UINT(axisZ.NcToPlc.StateDWord AND 16#FF);
    GVL_MachineManager.nZ2AxisState  := UDINT_TO_UINT(axisZ2.NcToPlc.StateDWord AND 16#FF);
    GVL_MachineManager.nExtAxisState := UDINT_TO_UINT(axisExtruder.NcToPlc.StateDWord AND 16#FF);
    GVL_MachineManager.bXAxisError   := FALSE;
    GVL_MachineManager.bYAxisError   := FALSE;
    GVL_MachineManager.bZAxisError   := FALSE;
    GVL_MachineManager.bZ2AxisError  := FALSE;
    GVL_MachineManager.bExtAxisError := FALSE;
END_IF

// Machine state
GVL_MachineManager.nMachineState       := nState;
GVL_MachineManager.bAllHomed           := bAllHomed;
GVL_MachineManager.bGroupBuilt         := bGroupBuilt;
GVL_MachineManager.bProgramLoaded      := bProgramLoaded;
GVL_MachineManager.bProgramRunning     := bProgramRunning;
GVL_MachineManager.bProgramError       := ItpHasError(sNciToPlc := stNciToPlc);
GVL_MachineManager.nInterpreterState   := stNciToPlc.ItpState;
GVL_MachineManager.bToolMeasureComplete:= bToolMeasureComplete;

// Tool measurement
GVL_MachineManager.fMeasuredZ    := fMeasuredZ;
GVL_MachineManager.fMeasuredZ2   := fMeasuredZ2;
GVL_MachineManager.fZToolOffset  := fZ_ToolOffset;
GVL_MachineManager.fZ2ToolOffset := fZ2_ToolOffset;

// PLC ready = enabled + homed + group built + tool measured
GVL_MachineManager.bPlcReady := bEnableSystem AND bAllHomed AND bGroupBuilt AND bToolMeasureComplete;

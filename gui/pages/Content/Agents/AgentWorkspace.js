import React, {useEffect, useState} from 'react';
import Image from 'next/image';
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Agents.module.css';
import ActivityFeed from './ActivityFeed';
import TaskQueue from './TaskQueue';
import RunHistory from "./RunHistory";
import ActionConsole from "./ActionConsole";
import Details from "./Details";
import ResourceManager from "./ResourceManager";
import {getAgentDetails, getAgentExecutions, updateExecution, addExecution, updateAgents, deleteExecution} from "@/app/DashboardService";
import {EventBus} from "@/utils/eventBus";

export default function AgentWorkspace({agentId, selectedProjectId}) {
  const [leftPanel, setLeftPanel] = useState('activity_feed')
  const [rightPanel, setRightPanel] = useState('details')
  const [history, setHistory] = useState(false)
  const [selectedRun, setSelectedRun] = useState(null)
  const [runModal, setRunModal] = useState(false)
  const [goals, setGoals] = useState(null)
  const [tools, setTools] = useState([])
  const [runName, setRunName] = useState("New Run")
  const [agentDetails, setAgentDetails] = useState(null)
  const [agentExecutions, setAgentExecutions] = useState(null)

  const addGoal = () => {
    setGoals((prevArray) => [...prevArray, 'new goal']);
  };

  const handleGoalChange = (index, newValue) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = newValue;
    setGoals(updatedGoals);
  };

  const handleGoalDelete = (index) => {
    const updatedGoals = [...goals];
    updatedGoals.splice(index, 1);
    setGoals(updatedGoals);
  };

  const handleRunNameChange = (event) => {
    setRunName(event.target.value);
  }

  const handleCreateRun = () => {
    if (runName.replace(/\s/g, '') === '') {
      toast.error("Run name can't be blank", {autoClose: 1800});
      return
    }

    if (goals.length <= 0) {
      toast.error("Agent needs to have goals", {autoClose: 1800});
      return
    }

    const executionData = { "agent_id": agentId, "name": runName }
    const agentData = { "agent_id": agentId, "key": "goal", "value": goals}

    addExecution(executionData)
      .then((response) => {
        setRunModal(false);
        fetchExecutions(agentId, response.data);
        EventBus.emit('reFetchAgents', {});
        toast.success("New run created", {autoClose: 1800});
      })
      .catch((error) => {
        console.error('Error creating execution:', error);
        toast.error("Could not create run", {autoClose: 1800});
      });

    updateAgents(agentData)
      .then((response) => {
        EventBus.emit('reFetchAgents', {});
      })
      .catch((error) => {
        console.error('Error updating agent:', error);
      });
  };

  const closeRunModal = () => {
    setGoals(null);
    setRunName("New Run");
    setRunModal(false);
  };

  const updateRunStatus = (status) => {
    const executionData = {"status": status};

    updateExecution(selectedRun.id, executionData)
      .then((response) => {
        fetchExecutions(agentId, response.data);
        EventBus.emit('reFetchAgents', {});
      })
      .catch((error) => {
        console.error('Error updating execution:', error);
      });
  };

  const preventDefault = (e) => {
    e.stopPropagation();
  };

  useEffect(() => {
    fetchAgentDetails(agentId);
    fetchExecutions(agentId);
  }, [agentId])

  function fetchAgentDetails(agentId) {
    getAgentDetails(agentId)
      .then((response) => {
        setAgentDetails(response.data);
        setTools(response.data.tools);
        setGoals(response.data.goal);
      })
      .catch((error) => {
        console.error('Error fetching agent details:', error);
      });
  }

  function fetchExecutions(agentId, currentRun = null) {
    getAgentExecutions(agentId)
      .then((response) => {
        setAgentExecutions(response.data);
        setSelectedRun(currentRun ? currentRun : response.data[0]);
      })
      .catch((error) => {
        console.error('Error fetching agent executions:', error);
      });
  }

  function removeExecution() {
    deleteExecution(selectedRun.id)
      .then((response) => {
        fetchExecutions(agentId);
        EventBus.emit('reFetchAgents', {});
      })
      .catch((error) => {
        console.error('Error updating execution:', error);
      });
  }

  return (<>
    <div style={{display:'flex'}}>
      {history && <RunHistory runs={agentExecutions} selectedRunId={selectedRun.id} setSelectedRun={setSelectedRun} setHistory={setHistory}/>}
      <div style={{width: history ? '40%' : '60%'}}>
        <div className={styles.detail_top}>
          <div style={{display:'flex'}}>
            {!history && <div style={{display:'flex',alignItems:'center',cursor:'pointer',marginRight:'7px'}} onClick={() => setHistory(true)}>
              <Image width={16} height={16} src="/images/history.svg" alt="history-icon"/>
            </div>}
            <div style={{display:'flex',alignItems:'center',marginLeft:'2px'}} className={styles.tab_text}>
              {selectedRun && selectedRun.status === 'RUNNING' && <div style={{marginLeft:'-6px'}}><Image width={14} height={14} style={{mixBlendMode: 'exclusion'}} src="/images/loading.gif" alt="loading-icon"/></div>}
              <div style={selectedRun && selectedRun.status === 'RUNNING' ? {marginLeft:'7px'} : {marginLeft:'-8px'}}>{selectedRun?.name || ''}</div>
            </div>
            <div style={{marginLeft:'7px'}}>
              <button onClick={() => setLeftPanel('activity_feed')} className={styles.tab_button} style={leftPanel === 'activity_feed' ? {background:'#454254'} : {background:'transparent'}}>Activity Feed</button>
            </div>
            {agentDetails && agentDetails.agent_type === 'Maintain Task Queue' && <div style={{marginLeft:'7px'}}>
              <button onClick={() => setLeftPanel('agent_type')} className={styles.tab_button} style={leftPanel === 'agent_type' ? {background:'#454254'} : {background:'transparent'}}>Task Queue</button>
            </div>}
          </div>
          <div style={{display:'flex'}}>
            {selectedRun && selectedRun.status === 'RUNNING' && <div style={{marginRight:'6px'}}>
              <button className={styles.pause_button} onClick={() => {updateRunStatus("PAUSED")}}>
                Pause Run
              </button>
            </div>}
            {selectedRun && (selectedRun.status === 'CREATED' || selectedRun.status === 'PAUSED') && <div style={{marginRight:'6px'}}>
              <button style={{padding:'8px 10px'}} className={styles.run_button} onClick={() => {updateRunStatus("RUNNING")}}>
                Resume
              </button>
            </div>}
            <div>
              <button className={styles.run_button} onClick={() => setRunModal(true)}>
                <Image width={14} height={14} src="/images/run_icon.svg" alt="run-icon"/>&nbsp;New Run
              </button>
            </div>
          </div>
        </div>
        <div className={styles.detail_body}>
          {leftPanel === 'activity_feed' && <div className={styles.detail_content}><ActivityFeed selectedRunId={selectedRun?.id || 0} selectedRunStatus={selectedRun?.status || 'CREATED'}/></div>}
          {leftPanel === 'agent_type' && <div className={styles.detail_content}><TaskQueue/></div>}
        </div>
      </div>
      <div style={{width:'40%'}}>
        <div className={styles.detail_top}>
          <div style={{display:'flex',overflowX:'scroll'}}>
            {/*<div>*/}
            {/*  <button onClick={() => setRightPanel('action_console')} className={styles.tab_button} style={rightPanel === 'action_console' ? {background:'#454254'} : {background:'transparent'}}>*/}
            {/*    Action Console*/}
            {/*  </button>*/}
            {/*</div>*/}
            {/*<div style={{marginLeft:'5px'}}>*/}
            {/*  <button onClick={() => setRightPanel('feedback')} className={styles.tab_button} style={rightPanel === 'feedback' ? {background:'#454254'} : {background:'transparent'}}>*/}
            {/*    Feedback*/}
            {/*  </button>*/}
            {/*</div>*/}
            <div style={{marginLeft:'5px'}}>
              <button onClick={() => setRightPanel('details')} className={styles.tab_button} style={rightPanel === 'details' ? {background:'#454254'} : {background:'transparent'}}>
                Details
              </button>
            </div>
            <div style={{marginLeft:'5px'}}>
              <button onClick={() => setRightPanel('resource_manager')} className={styles.tab_button} style={rightPanel === 'resource_manager' ? {background:'#454254'} : {background:'transparent'}}>
                Resource Manager
              </button>
            </div>
            {/*<div style={{marginLeft:'5px'}}>*/}
            {/*  <button onClick={() => setRightPanel('logs')} className={styles.tab_button} style={rightPanel === 'logs' ? {background:'#454254'} : {background:'transparent'}}>*/}
            {/*    Logs*/}
            {/*  </button>*/}
            {/*</div>*/}
          </div>
        </div>
        <div className={styles.detail_body} style={{paddingRight:'0'}}>
          {rightPanel === 'action_console' && <ActionConsole/>}
          {rightPanel === 'details' && <div className={styles.detail_content}><Details agentDetails={agentDetails} tools={tools} runCount={agentExecutions?.length || 0}/></div>}
          {rightPanel === 'resource_manager' && <ResourceManager selectedProjectId={selectedProjectId}/>}
        </div>
      </div>

      {runModal && (<div className="modal" onClick={closeRunModal}>
        <div className="modal-content" style={{width: '35%'}} onClick={preventDefault}>
          <div className={styles.detail_name}>Run agent name</div>
          <div>
            <label className={styles.form_label}>Name</label>
            <input className="input_medium" type="text" value={runName} onChange={handleRunNameChange}/>
          </div>
          {goals && goals.length > 0 && <div style={{marginTop: '15px'}}>
            <div><label className={styles.form_label}>Goals</label></div>
            {goals.map((goal, index) => (<div key={index} style={{marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{flex:'1'}}><input className="input_medium" type="text" value={goal} onChange={(event) => handleGoalChange(index, event.target.value)}/></div>
              <div>
                <button className={styles.agent_button} style={{marginLeft:'4px',padding:'5px'}} onClick={() => handleGoalDelete(index)}>
                  <Image width={20} height={21} src="/images/close_light.svg" alt="close-icon"/>
                </button>
              </div>
            </div>))}
            <div><button className={styles.agent_button} onClick={addGoal}>+ Add</button></div>
          </div>}
          <div style={{display: 'flex', justifyContent: 'flex-end'}}>
            <button className={styles.agent_button} style={{marginRight: '10px'}} onClick={closeRunModal}>
              Cancel
            </button>
            <button className={styles.run_button} style={{paddingLeft:'15px',paddingRight:'25px'}} onClick={() => handleCreateRun()}>
              <Image width={14} height={14} src="/images/run_icon.svg" alt="run-icon"/>&nbsp;Run
            </button>
          </div>
        </div>
      </div>)}
    </div>
    <ToastContainer/>
  </>);
}

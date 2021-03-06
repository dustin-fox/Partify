import React, {Component} from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { compose, withHandlers } from 'recompose'
import { firebaseConnect, populate } from 'react-redux-firebase'
import Theme from 'theme'
import { withNotifications } from 'modules/notification'
import Grid from '../../componets/Grid/Grid.js';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import classes from './Songs.scss'
import ContentAdd from 'material-ui/svg-icons/content/send';
import { success, error, warning, info, removeAll } from 'react-notification-system-redux';
import SearchBar from 'material-ui-search-bar';
import {push} from 'react-router-redux'

const populates = [{ child: 'createdBy', root: 'users' }]
 const mapDispatchToProps = (dispatch)=> {
 return({
    changeLocation: (loc) => dispatch(push(loc)),
    sendError: (errorObj) => dispatch(error(errorObj)),
    sendInfo: (infoObj) => dispatch(info(infoObj)),
 })
 }


const fixedbutton = {
    position: 'fixed',
    bottom: '50px',
    right: '50px', 
    size: '400px'
}


@firebaseConnect([{ path: '/projects' }])
@connect(
    ({ firebase, firebase: { auth, data: { projects }, profile } }, { params }) => ({
        auth,
        projects: populate(firebase, 'projects', populates),
        profile,
        params: params
    }),mapDispatchToProps
)

export default class Songs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            input : '',
            items: [],
            songs: [],
        }
    }

    static propTypes = {
        children: PropTypes.object,
        firebase: PropTypes.object.isRequired,
        auth: PropTypes.object
    }

    onChange = data => {
        this.setState({songs: [], input: data});
    }

    onTouchTap = song => {
        const { songs } = this.state;
        if(songs.includes(song)){
            const index = songs.indexOf(song);
            if (index !== -1) {
                songs.splice(index, 1);
            } 
            this.setState({songs: songs});
        } else {
            this.setState({songs: songs.concat([song])});
        }
    }

    submitSongs = async props => {
        const {name} = this.props.params;
        const {sendError,changeLocation, auth, profile, firebase,sendInfo} = this.props;
        const {songs} = this.state;
        if(songs.length > 0){
            songs.forEach( song => {
                song.project = { 
                    name: name,
                    votedUpBy: '',
                    votedDownBy: '',
                    votes: 0,
                    submitedBy: auth.uid,
                    author: profile.displayName || "Anonymous"
                }
            });
            const accessRef = firebase.database().ref(`projects/${name}/access_token`);
            const refreshRef = firebase.database().ref(`projects/${name}/refresh_token`);
            const deviceRef = firebase.database().ref(`projects/${name}/device`);
            const snapshotAccess = await accessRef.once('value');
            const snapshotRefresh = await refreshRef.once('value');
            const device = await deviceRef.once('value');
            const body = {
                songs : songs,
                name: name,
                device: device.val(),
                access_token: snapshotAccess.val(), 
                refresh_token: snapshotRefresh.val(), 
            }
            fetch("/song-queue",{
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify(body) 
            })
                .then( res =>{ return res.status })
                .then( val => { 
                    if(val == 200) {
                        const notificationOpts = {
                            title: 'Songs Added to Queue',
                            message: 'Vote it up to play next',
                            position: 'tr',
                        };
                        sendInfo(notificationOpts)
                    }
                })
                .catch( err => {
                    this.props.dispatch(error({
                        title: 'Error',
                        message: 'Try again',
                        position: 'tr',
                    }))
                } )
            changeLocation(`Host/Party/${name}`) 
        } else {
            const notificationOpts = {
                title: 'Add Songs First',
                message: 'Submit Queue Empty',
                position: 'tr',
            };
            sendError(notificationOpts)
        }
    }

    addNew = async e =>{
        const {name} = this.props.params;
        const { firebase, sendError, sendInfo} = this.props;
        const {input} = this.state;
        const accessRef         = firebase.database().ref(`projects/${name}/access_token`);
        const refreshRef        = firebase.database().ref(`projects/${name}/refresh_token`);
        const snapshotAccess    = await accessRef.once('value');
        const snapshotRefresh   = await refreshRef.once('value');
        const body = {
            search: input, 
            access_token: snapshotAccess.val(), 
            refresh_token: snapshotRefresh.val(), 
            name: name}
        fetch("/search",{
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(body) 
        })
            .then(data => {return data.json()})
            .then(text => {
                if(text.tracks.items.length === 0){
                    const notificationOpts = {
                        title: 'Search Had No Results',
                        message: 'Try another search',
                        position: 'tr',
                    };
                   sendError(notificationOpts)
                }
                else {
                    const notificationOpts = {
                        title: 'Search Success',
                        message: 'Results',
                        position: 'tr',
                    };
                    sendInfo(notificationOpts)
                    this.setState({items: text.tracks.items});
                }}
            )
            .catch((error => { console.log(error) }));
    }

    onSubmitFail = (formErrs, dispatch, err) => {
        props.showError(formErrs ? 'Form Invalid' : err.message || 'Error')
    } 

    render() {
        const { uid, addNew, onSubmitFail } = this.props 
        return (
            <div className={classes.container} style={{ color: Theme.palette.primary2Color }}>
                <SearchBar
                    onChange={this.onChange}
                    onRequestSearch={this.addNew}
                    style={{
                        margin: '30 auto',
                        width: '60%',
                        height: '100%'
                    }}
                />
                <br/>
                <Grid
                    tilesData = {this.state.items}
                    handleTouchTap = { this.onTouchTap }
                />
                { this.state.items.length > 0 && this.state.songs.length > 0&&
                <FloatingActionButton 
                    style={fixedbutton}
                    secondary={true}
                    onClick={this.submitSongs} >
                    <ContentAdd />
                </FloatingActionButton>

                }
            </div>
        )
    }
}

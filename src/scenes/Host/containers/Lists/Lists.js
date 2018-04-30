import React, {Component} from 'react'
import ContentAdd from 'material-ui/svg-icons/content/add';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import {push} from 'react-router-redux'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { firebaseConnect, getVal } from 'react-redux-firebase'
import SongsList from '../../componets/SongsList/index.js'
import { UserIsAuthenticated } from 'utils/router'
import { success, error, warning, info, removeAll } from 'react-notification-system-redux';
import { isEmpty } from 'react-redux-firebase'
import { map } from 'lodash'
import Immutable from 'immutable';


const fixedbutton = {
    position: 'fixed',
    bottom: '50px',
    right: '50px', 
    size: '400px'
}

const mapDispatchToProps = (dispatch)=> {
    return({
        changeLocation: (loc) => dispatch(push(loc)),
        sendError: (errorObj) => dispatch(error(errorObj)),
        sendInfo: (infoObj) => dispatch(info(infoObj)),
    })
}

@UserIsAuthenticated

@firebaseConnect((props) => {
    return [
        { path: 'projects' }, // create todo listener
    ]
})

@connect(({ firebase, firebase: { auth, profile },},props) => (
    {

        songs:  firebase.data.projects ? Immutable.Map(firebase.data.projects[`${props.params.name}`].Songs) : Immutable.Map() , // lodash's get can also be used
        auth: auth,
        name: props.params.name,
        profile,
        uid: auth.uid,
    }),
    mapDispatchToProps,
)

export default class Lists extends Component {
    constructor(props){
        super(props);
        this.state = {
            items : this.getItems(),
        }
    }


    getItems = () =>{
        const {songs,params,uid,profile} = this.props;
        const items = map( songs.toJS(), (song, id)  => {
            const disabledUp = typeof song.song.project.votedUpBy == 'object' ? Object.keys(song.song.project.votedUpBy).map( key => key).includes(uid)  : false;
            const disabledDown = typeof song.song.project.votedDownBy == 'object' ? Object.keys(song.song.project.votedDownBy).map( key => key).includes(uid)  : false;
            const visableDelete = song.song.project.submitedBy === uid  
            const active = song.song.active ? true : false;
            const author = song.song.project.author;
            const img = song.song.album.images[0].url;
            return {
                disabledUp,
                disabledDown,
                visableDelete,
                active,
                author,
                img,
                song: song.song,
                id,
            }
        })
        return Immutable.List(items);
    }

    componentWillMount(){
        const items = this.getItems();
        this.setState({items: items}, () => {
            console.log(this.state.items, 'items updated');
        }); 
    }

    componentWillReceiveProps(oldProps){
        if(!oldProps.songs.equals(this.props.songs)){
            const items = this.getItems();
            this.setState({items: items}, () => {
                console.log(this.state.items, 'items updated');
                this.forceUpdate()
            }); 
        }
    }

    shouldComponentUpdate(nextProps){
        return !nextProps.songs.equals(this.props.songs) ? true : false;
    }


    onClick = e => {
        this.props.changeLocation(`Host/Songs/${this.props.params.name}`) 
    }

    upVote = async (songObj,id) => {
        const {sendError, sendInfo, firebase, uid}= this.props;
        const song = songObj.song;
        try{
            let refVote = firebase.database().ref(`projects/${this.props.name}/Songs/${id}/song/project/votes`)
            let refBy = firebase.database().ref(`projects/${this.props.name}/Songs/${id}/song/project/votedUpBy/${uid}`).set(uid);
            await refVote.transaction( (votes) => {
                return (votes || 0) + 1;
            });
            sendInfo({
                title: song.name+" Upvoted ",
                position: 'tr',
            })
        }catch( e ){
            sendError({
                title: 'Error Upvoting',
                position: 'tr',
            })
        }
    }

    downVote = (song,id) => {
        const {sendError, sendInfo,name,firebase, uid}= this.props;
        try{
            let refVote = firebase.database().ref(`projects/${name}/Songs/${id}/song/project/votes`)
            let refBy = firebase.database().ref(`projects/${name}/Songs/${id}/song/project/votedDownBy/${uid}`).set(uid);
            const votes = refVote.transaction( (votes) => {
                return (votes || 0) - 1;
            });
            votes.then( data => {
                if(data.snapshot.val() < -1){
                    firebase.database().ref(`projects/${name}/Songs/${id}/`).remove();
                    sendInfo({
                        title: song.name+" was removed due to low votes ",
                        position: 'tr',
                    })
                }else{
                    sendInfo({
                        title: song.name+" Downvoted ",
                        position: 'tr',
                    })
                }

            } )
        }catch( e ){
            sendError({
                title: 'Error Upvoting',
                position: 'tr',
            })
            console.error(e.message,e.stack)
        }
    }

    onDelete = (song,id) => {
        const { sendInfo, sendError, firebase, name} = this.props;
        try{
            let ref =  firebase.database().ref(`projects/${name}/Songs/${id}/`);
            ref.remove( e =>{
                if( error ) throw Error(e.message)
                sendInfo({
                    title: 'Song '+song.name+' Deleted',
                    position: 'tr',
                })
            });
        }catch( e ){
            sendError({
                title: 'Error Deleting '+song,
                position: 'tr',
            })
            console.error(e.message,e.stack)
        }
    }


    render() {
        const {songs,params,uid,profile} = this.props;
        //const songs = project ? project.Songs: null;
        const { items } = this.state;
        console.log("render",items,songs)
        return (
            <div> 
            { !isEmpty(items) ? (
                <div>
                    {items.size}
                <SongsList 
                    uid={uid}
                    onDelete={this.onDelete}
                    upVote={this.upVote}
                    downVote={this.downVote}
                    name={params.name} 
                    songs={items} /> 
            </div>
            ) : (
                <div className={""}>Song Queue Empty</div>
        )}
        <FloatingActionButton 
            style={fixedbutton}
            secondary={true}
            onClick={this.onClick}>
            <ContentAdd />
            </FloatingActionButton>
        </div>
        );
    }
}

